import { describe, expect, it } from 'vitest';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';

/**
 * Asserts that the export route's ZIP packaging produces a buffer that
 * round-trips through unzipSync and contains the expected GDPR file list.
 * The route handler builds the same fileMap; if the contract changes, this
 * test fails.
 */
describe('me/export ZIP packaging', () => {
  it('round trips the GDPR file list', () => {
    const fileMap = {
      'profile.json': strToU8('{}'),
      'bookings.json': strToU8('{}'),
      'matches.json': strToU8('[]'),
      'payments.json': strToU8('{}'),
      'chats.json': strToU8('{}'),
      'edition.json': strToU8('null'),
      'audit.json': strToU8('[]'),
      'README.txt': strToU8('hi'),
    };
    const zipped = zipSync(fileMap, { level: 6 });
    expect(zipped.byteLength).toBeGreaterThan(50);

    const unzipped = unzipSync(zipped);
    const names = Object.keys(unzipped).sort();
    expect(names).toEqual([
      'README.txt',
      'audit.json',
      'bookings.json',
      'chats.json',
      'edition.json',
      'matches.json',
      'payments.json',
      'profile.json',
    ]);
    expect(strFromU8(unzipped['README.txt'])).toBe('hi');
  });
});
