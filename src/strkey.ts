/**
 * Strkey encoding/decoding for Stellar addresses.
 *
 * Implements RFC 4648 base32 (alphabet ABCDEFGHIJKLMNOPQRSTUVWXYZ234567, no
 * padding) and CRC16-XModem checksum, combined into the Stellar strkey format:
 *   base32(versionByte || payload || crc16(versionByte || payload))
 *
 * Zero external dependencies.
 */

// ---- Base32 (RFC 4648) ----

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const BASE32_DECODE_TABLE = new Uint8Array(128);
BASE32_DECODE_TABLE.fill(0xff);
for (let i = 0; i < BASE32_ALPHABET.length; i++) {
  BASE32_DECODE_TABLE[BASE32_ALPHABET.charCodeAt(i)!] = i;
}

export function encodeBase32(data: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;
  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i]!;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return result;
}

export function decodeBase32(input: string): Uint8Array {
  const output: number[] = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 128) throw new Error(`Invalid base32 character: ${input[i]}`);
    const digit = BASE32_DECODE_TABLE[code]!;
    if (digit === 0xff) throw new Error(`Invalid base32 character: ${input[i]}`);
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(output);
}

// ---- CRC16-XModem ----

const CRC16_TABLE = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  let crc = i << 8;
  for (let j = 0; j < 8; j++) {
    if (crc & 0x8000) {
      crc = ((crc << 1) ^ 0x1021) & 0xffff;
    } else {
      crc = (crc << 1) & 0xffff;
    }
  }
  CRC16_TABLE[i] = crc;
}

export function crc16xmodem(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc = ((crc << 8) & 0xffff) ^ CRC16_TABLE[((crc >>> 8) ^ data[i]!) & 0xff]!;
  }
  return crc;
}

// ---- Version bytes ----

export const STRKEY_ED25519_PUBLIC = 6 << 3;   // 48 → 'G'
export const STRKEY_MUXED_ED25519 = 12 << 3;   // 96 → 'M'
export const STRKEY_PRE_AUTH_TX = 19 << 3;      // 152 → 'T'
export const STRKEY_HASH_X = 23 << 3;           // 184 → 'X'
export const STRKEY_CONTRACT = 2 << 3;          // 16 → 'C'
export const STRKEY_SIGNED_PAYLOAD = 15 << 3;   // 120 → 'P'

// ---- Strkey encode/decode ----

export function encodeStrkey(versionByte: number, payload: Uint8Array): string {
  const data = new Uint8Array(1 + payload.length + 2);
  data[0] = versionByte;
  data.set(payload, 1);
  const crc = crc16xmodem(data.subarray(0, 1 + payload.length));
  // CRC is little-endian
  data[1 + payload.length] = crc & 0xff;
  data[1 + payload.length + 1] = (crc >>> 8) & 0xff;
  return encodeBase32(data);
}

export function decodeStrkey(str: string): { version: number; payload: Uint8Array } {
  const data = decodeBase32(str);
  if (data.length < 3) {
    throw new Error('Strkey too short');
  }
  const version = data[0]!;
  const payload = data.subarray(1, data.length - 2);
  const expectedCrc = data[data.length - 2]! | (data[data.length - 1]! << 8);
  const actualCrc = crc16xmodem(data.subarray(0, data.length - 2));
  if (expectedCrc !== actualCrc) {
    throw new Error(
      `Strkey checksum mismatch: expected ${expectedCrc}, got ${actualCrc}`,
    );
  }
  return { version, payload };
}
