import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query') ?? undefined;
    const tags = url.searchParams.getAll('tags');
    const status = url.searchParams.get('status') ?? undefined;
    const closing_before = url.searchParams.get('closing_before') ?? undefined;
    const closing_after = url.searchParams.get('closing_after') ?? undefined;
    const created_after = url.searchParams.get('created_after') ?? undefined;

    // Use the caller's auth context (JWT or service role)
    const authHeader = req.headers.get('authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      authHeader ? { global: { headers: { authorization: authHeader } } } : {},
    );

    let q = supabase.from('questions').select('*');

    if (query) {
      q = q.or(
        `title.ilike.%${query}%,description.ilike.%${query}%,resolution_criteria.ilike.%${query}%`,
      );
    }

    if (status) {
      q = q.eq('resolution_status', status);
    }

    if (tags.length > 0) {
      q = q.contains('tags', tags);
    }

    if (closing_before) {
      q = q.lte('close_date', closing_before);
    }

    if (closing_after) {
      q = q.gte('close_date', closing_after);
    }

    if (created_after) {
      q = q.gte('created_at', created_after);
    }

    q = q.order('created_at', { ascending: false });

    const { data, error } = await q;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: data ?? [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
