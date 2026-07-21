import { describe, expect, it } from 'vitest';
import { getVendorPrefix } from './mac-address-lookup.service';

describe('mac address lookup service', () => {
  it.each([
    ['20:37:06:12:34:56', '203706'],
    ['20-37-06-12-34-56', '203706'],
    ['2037.0612.3456', '203706'],
    [' 20:37:06 ', '203706'],
  ])('normalizes %s to an OUI prefix', (address, expectedPrefix) => {
    expect(getVendorPrefix(address)).toBe(expectedPrefix);
  });
});
