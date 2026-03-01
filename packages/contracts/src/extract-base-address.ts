/**
 * extractBaseAddress — extract the underlying G-address from a G- or M-address.
 */

import {
  decodeStrkey,
  encodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_MUXED_ED25519,
} from '@stellar/xdr';

/**
 * Extract the base ed25519 public key (G-address) from a Stellar address.
 *
 * - If the input is a G-address (56 chars), return it as-is.
 * - If the input is an M-address (69 chars), decode the muxed account and
 *   return the underlying G-address.
 * - Otherwise, throw a TypeError.
 */
export function extractBaseAddress(address: string): string {
  // Fast path: G-addresses are already base addresses
  if (address.length === 56 && address.startsWith('G')) {
    return address;
  }

  const { version, payload } = decodeStrkey(address);

  if (version === STRKEY_ED25519_PUBLIC) {
    return address;
  }

  if (version === STRKEY_MUXED_ED25519) {
    // Muxed payload = 32 bytes ed25519 key + 8 bytes id
    const ed25519Key = payload.subarray(0, 32);
    return encodeStrkey(STRKEY_ED25519_PUBLIC, ed25519Key);
  }

  throw new TypeError(
    `Cannot extract base address: expected G- or M-address, got version byte ${version}`,
  );
}
