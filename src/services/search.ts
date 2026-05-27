import { supabase } from '@/integrations/supabase/client';
import type { Question } from '@/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface SearchParams {
  query?: string;
  tags?: string[];
  /** 'all' | 'pending' | 'yes' | 'no' */
  status?: string;
  closing_before?: string;
  closing_after?: string;
  created_after?: string;
}

export async function searchQuestions(
  params: SearchParams,
): Promise<{ data: Question[] | null; error: Error | null }> {
  const qs = new URLSearchParams();

  if (params.query) qs.set('query', params.query);
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.closing_before) qs.set('closing_before', params.closing_before);
  if (params.closing_after) qs.set('closing_after', params.closing_after);
  if (params.created_after) qs.set('created_after', params.created_after);
  if (params.tags && params.tags.length > 0) {
    for (const tag of params.tags) qs.append('tags', tag);
  }

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/search-questions?${qs.toString()}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    const json = (await res.json()) as { data?: Question[]; error?: string };
    if (!res.ok || json.error) {
      return { data: null, error: new Error(json.error ?? 'Search failed') };
    }
    return { data: json.data ?? [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
