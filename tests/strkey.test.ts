import { describe, it, expect } from 'vitest';
import {
  encodeBase32,
  decodeBase32,
  crc16xmodem,
  encodeStrkey,
  decodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_MUXED_ED25519,
  STRKEY_PRE_AUTH_TX,
  STRKEY_HASH_X,
  STRKEY_CONTRACT,
} from '../src/index.js';

// ============================================================
// Base32
// ============================================================

describe('base32', () => {
  it('encodes empty', () => {
    expect(encodeBase32(new Uint8Array())).toBe('');
  });

  it('decodes empty', () => {
    expect(decodeBase32('')).toEqual(new Uint8Array());
  });

  it('roundtrips single byte', () => {
    const data = new Uint8Array([0x61]); // 'a'
    const encoded = encodeBase32(data);
    expect(encoded).toBe('ME');
    expect(decodeBase32(encoded)).toEqual(data);
  });

  it('roundtrips "Hello"', () => {
    const data = new TextEncoder().encode('Hello');
    const encoded = encodeBase32(data);
    expect(encoded).toBe('JBSWY3DP');
    expect(decodeBase32(encoded)).toEqual(data);
  });

  it('roundtrips arbitrary bytes', () => {
    const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x42]);
    expect(decodeBase32(encodeBase32(data))).toEqual(data);
  });

  it('rejects invalid characters', () => {
    expect(() => decodeBase32('A0')).toThrow('Invalid base32 character');
    expect(() => decodeBase32('a')).toThrow('Invalid base32 character');
  });
});

// ============================================================
// CRC16-XModem
// ============================================================

describe('crc16xmodem', () => {
  it('empty input → 0', () => {
    expect(crc16xmodem(new Uint8Array())).toBe(0);
  });

  it('known test vector: "123456789"', () => {
    const data = new TextEncoder().encode('123456789');
    expect(crc16xmodem(data)).toBe(0x31c3);
  });

  it('single byte 0x00', () => {
    expect(crc16xmodem(new Uint8Array([0]))).toBe(0);
  });
});

// ============================================================
// Strkey encode/decode
// ============================================================

describe('strkey', () => {
  it('encodes all-zero ed25519 public key to G-address', () => {
    const key = new Uint8Array(32);
    const strkey = encodeStrkey(STRKEY_ED25519_PUBLIC, key);
    expect(strkey.startsWith('G')).toBe(true);
    expect(strkey.length).toBe(56);
  });

  it('roundtrips ed25519 public key', () => {
    const key = new Uint8Array(32);
    key[0] = 0x3c;
    key[1] = 0xb3;
    key[31] = 0xef;
    const strkey = encodeStrkey(STRKEY_ED25519_PUBLIC, key);
    const decoded = decodeStrkey(strkey);
    expect(decoded.version).toBe(STRKEY_ED25519_PUBLIC);
    expect(decoded.payload).toEqual(key);
  });

  it('roundtrips muxed account (40-byte payload)', () => {
    const payload = new Uint8Array(40);
    payload[0] = 0xaa;
    payload[39] = 0xff;
    const strkey = encodeStrkey(STRKEY_MUXED_ED25519, payload);
    expect(strkey.startsWith('M')).toBe(true);
    const decoded = decodeStrkey(strkey);
    expect(decoded.version).toBe(STRKEY_MUXED_ED25519);
    expect(decoded.payload).toEqual(payload);
  });

  it('pre-auth tx starts with T', () => {
    const payload = new Uint8Array(32);
    const strkey = encodeStrkey(STRKEY_PRE_AUTH_TX, payload);
    expect(strkey.startsWith('T')).toBe(true);
  });

  it('hash-x starts with X', () => {
    const payload = new Uint8Array(32);
    const strkey = encodeStrkey(STRKEY_HASH_X, payload);
    expect(strkey.startsWith('X')).toBe(true);
  });

  it('contract starts with C', () => {
    const payload = new Uint8Array(32);
    const strkey = encodeStrkey(STRKEY_CONTRACT, payload);
    expect(strkey.startsWith('C')).toBe(true);
  });

  it('rejects corrupted checksum', () => {
    const key = new Uint8Array(32);
    const valid = encodeStrkey(STRKEY_ED25519_PUBLIC, key);
    // Corrupt last character
    const corrupted =
      valid.slice(0, -1) + (valid[valid.length - 1] === 'A' ? 'B' : 'A');
    expect(() => decodeStrkey(corrupted)).toThrow('checksum');
  });

  it('rejects too-short input', () => {
    expect(() => decodeStrkey('AB')).toThrow();
  });

  it('known G-address for all-zeros key', () => {
    // Well-known: 32 zero bytes → GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF
    const key = new Uint8Array(32);
    const strkey = encodeStrkey(STRKEY_ED25519_PUBLIC, key);
    expect(strkey).toBe('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
  });
});
