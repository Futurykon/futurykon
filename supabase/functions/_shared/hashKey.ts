import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';
import { encodeHex } from 'https://deno.land/std@0.224.0/encoding/hex.ts';

/**
 * SHA-256 hex hash of a raw API key.
 *
 * Must stay byte-identical to the browser implementation in
 * src/services/apiKeys.ts — see test/fixtures/hashKeyFixture.ts for the
 * shared parity fixture asserted by both sides.
 */
export async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return encodeHex(new Uint8Array(hash));
}
