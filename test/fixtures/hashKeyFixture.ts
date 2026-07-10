/**
 * Shared fixture asserting the browser (src/services/apiKeys.ts) and Deno
 * (supabase/functions/_shared/hashKey.ts) SHA-256 hex implementations of
 * hashKey stay byte-identical.
 *
 * If these two implementations ever diverge, every API Key silently stops
 * validating (the browser hashes a raw key differently than the Edge
 * Function that checks it against `api_keys.key_hash`).
 *
 * This file is imported by both a vitest test and a Deno test, so keep it
 * free of runtime-specific syntax (plain TS, no import assertions).
 */
export const HASH_KEY_FIXTURE = {
  key: 'futurykon-hashkey-fixture-2026',
  sha256: '3eb7c81c55bb1b2d65bfa1e8ec24bcd9b7909dd0ed00a3e20087b1a9b463e369',
} as const;
