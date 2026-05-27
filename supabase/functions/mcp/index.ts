import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';
import { encodeHex } from 'https://deno.land/std@0.224.0/encoding/hex.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return encodeHex(new Uint8Array(hash));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  let body: { tool: string; params: Record<string, unknown>; api_key: string };
  try {
    body = await req.json();
  } catch {
    return respond({ error: 'Invalid JSON body' }, 400);
  }

  const { tool, params = {}, api_key } = body;

  if (!api_key) return respond({ error: 'Missing api_key' }, 401);
  if (!tool) return respond({ error: 'Missing tool' }, 400);

  // Service role client — bypasses RLS
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Validate API key
  const keyHash = await hashKey(api_key);
  const { data: keyRow, error: keyErr } = await admin
    .from('api_keys')
    .select('user_id')
    .eq('key_hash', keyHash)
    .single();

  if (keyErr || !keyRow) return respond({ error: 'Invalid API key' }, 401);

  const userId = keyRow.user_id as string;

  // Resolve user profile (for is_admin)
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  const isAdmin = profile?.is_admin === true;

  // Admin-only tools
  const adminTools = ['create_question', 'resolve_question', 'delete_question'];
  if (adminTools.includes(tool) && !isAdmin) {
    return respond({ error: 'Admin access required' }, 403);
  }

  try {
    switch (tool) {
      case 'list_questions': {
        let q = admin.from('questions').select('*');
        if (params.status) q = q.eq('resolution_status', params.status as string);
        if (params.tag) q = q.contains('tags', [params.tag as string]);
        q = q.order('created_at', { ascending: false });
        const { data, error } = await q;
        if (error) return respond({ error: error.message }, 500);
        return respond({ data });
      }

      case 'search_questions': {
        const searchUrl = new URL(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/search-questions`,
        );
        if (params.query) searchUrl.searchParams.set('query', params.query as string);
        if (params.status) searchUrl.searchParams.set('status', params.status as string);
        if (params.closing_before) searchUrl.searchParams.set('closing_before', params.closing_before as string);
        if (params.closing_after) searchUrl.searchParams.set('closing_after', params.closing_after as string);
        if (params.created_after) searchUrl.searchParams.set('created_after', params.created_after as string);
        if (Array.isArray(params.tags)) {
          for (const tag of params.tags) searchUrl.searchParams.append('tags', tag as string);
        }
        const res = await fetch(searchUrl.toString(), {
          headers: { authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        });
        const json = await res.json();
        return respond(json, res.status);
      }

      case 'get_question': {
        const { data: question, error } = await admin
          .from('questions')
          .select('*')
          .eq('id', params.id as string)
          .single();
        if (error) return respond({ error: error.message }, 404);

        const { data: cp } = await admin
          .from('community_predictions')
          .select('*')
          .eq('question_id', params.id as string)
          .single();

        return respond({ data: { ...question, community_prediction: cp ?? null } });
      }

      case 'get_my_predictions': {
        // Latest prediction per question for this user
        const { data, error } = await admin
          .from('predictions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) return respond({ error: error.message }, 500);

        // Deduplicate — keep latest per question_id
        const seen = new Set<string>();
        const latest = (data ?? []).filter((p) => {
          if (seen.has(p.question_id)) return false;
          seen.add(p.question_id);
          return true;
        });
        return respond({ data: latest });
      }

      case 'get_leaderboard': {
        const { data: scores, error } = await admin
          .from('question_scores')
          .select('user_id, log_score');
        if (error) return respond({ error: error.message }, 500);

        const { data: counts } = await admin
          .from('predictions')
          .select('user_id, question_id');

        const questionCountPerUser = new Map<string, Set<string>>();
        for (const row of counts ?? []) {
          if (!questionCountPerUser.has(row.user_id)) questionCountPerUser.set(row.user_id, new Set());
          questionCountPerUser.get(row.user_id)!.add(row.question_id);
        }

        const userScores = new Map<string, number[]>();
        for (const row of scores ?? []) {
          if (!userScores.has(row.user_id)) userScores.set(row.user_id, []);
          userScores.get(row.user_id)!.push(row.log_score);
        }

        const leaderboard = [];
        for (const [uid, sc] of userScores) {
          if ((questionCountPerUser.get(uid)?.size ?? 0) < 5) continue;
          const avg = sc.reduce((a, b) => a + b, 0) / sc.length;
          leaderboard.push({ user_id: uid, avg_log_score: avg, scored_count: sc.length });
        }
        leaderboard.sort((a, b) => b.avg_log_score - a.avg_log_score);
        return respond({ data: leaderboard });
      }

      case 'create_prediction': {
        const { data, error } = await admin.from('predictions').insert({
          question_id: params.question_id as string,
          user_id: userId,
          probability: Math.round(params.probability as number),
          reasoning: (params.reasoning as string) ?? null,
        }).select().single();
        if (error) return respond({ error: error.message }, 500);
        return respond({ data });
      }

      case 'create_question': {
        const { data, error } = await admin.from('questions').insert({
          title: params.title as string,
          description: (params.description as string) ?? null,
          resolution_criteria: params.resolution_criteria as string,
          close_date: params.close_date as string,
          tags: (params.tags as string[]) ?? [],
          resolution_status: 'pending',
          created_by: userId,
        }).select().single();
        if (error) return respond({ error: error.message }, 500);
        return respond({ data });
      }

      case 'resolve_question': {
        const { data, error } = await admin
          .from('questions')
          .update({
            resolution_status: params.outcome as string,
            resolution_date: new Date().toISOString(),
          })
          .eq('id', params.id as string)
          .select()
          .single();
        if (error) return respond({ error: error.message }, 500);
        return respond({ data });
      }

      case 'delete_question': {
        const { error } = await admin
          .from('questions')
          .delete()
          .eq('id', params.id as string);
        if (error) return respond({ error: error.message }, 500);
        return respond({ data: { deleted: true } });
      }

      default:
        return respond({ error: `Unknown tool: ${tool}` }, 400);
    }
  } catch (err) {
    return respond({ error: String(err) }, 500);
  }
});
