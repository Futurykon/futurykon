import { describe, test, expect } from 'vitest';
import { hashKey } from './apiKeys';
import { HASH_KEY_FIXTURE } from '../../test/fixtures/hashKeyFixture';

describe('hashKey', () => {
  test('reproduces the shared parity fixture SHA-256 digest', async () => {
    await expect(hashKey(HASH_KEY_FIXTURE.key)).resolves.toBe(HASH_KEY_FIXTURE.sha256);
  });
});
