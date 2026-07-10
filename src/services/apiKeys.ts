import { supabase } from '@/integrations/supabase/client';

/** Returns the current user's api_key row (without the hash — only metadata). */
export function getApiKey(userId: string) {
  return supabase
    .from('api_keys')
    .select('id, created_at')
    .eq('user_id', userId)
    .maybeSingle();
}

/** Generate a cryptographically random API key string. */
function generateRawKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** SHA-256 hex hash of the raw key (stored in DB). */
async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate (or replace) the user's API key.
 * Returns the raw key — caller must show it once and discard.
 */
export async function generateApiKey(userId: string): Promise<{ rawKey: string | null; error: Error | null }> {
  try {
    const rawKey = generateRawKey();
    const keyHash = await hashKey(rawKey);

    const { error } = await supabase
      .from('api_keys')
      .upsert(
        { user_id: userId, key_hash: keyHash, created_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );

    if (error) return { rawKey: null, error: new Error(error.message) };
    return { rawKey, error: null };
  } catch (err) {
    return { rawKey: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/** Delete the user's current API key. */
export function deleteApiKey(userId: string) {
  return supabase
    .from('api_keys')
    .delete()
    .eq('user_id', userId);
}
