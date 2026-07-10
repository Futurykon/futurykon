import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { hashKey } from './hashKey.ts';
import { HASH_KEY_FIXTURE } from '../../../test/fixtures/hashKeyFixture.ts';

// Run with: deno test supabase/functions/_shared/hashKey.test.ts
Deno.test('hashKey reproduces the shared parity fixture SHA-256 digest', async () => {
  const digest = await hashKey(HASH_KEY_FIXTURE.key);
  assertEquals(digest, HASH_KEY_FIXTURE.sha256);
});
