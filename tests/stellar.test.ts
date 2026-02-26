import { describe, it, expect } from 'vitest';
import {
  fixedOpaque,
  taggedUnion,
  xdrEnum,
  xdrStruct,
  uint64,
  jsonAs,
  stellarPublicKey,
  stellarAccountId,
  stellarMuxedAccount,
  stellarAssetCode4,
  stellarAssetCode12,
  encodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_MUXED_ED25519,
  type XdrCodec,
} from '../src/index.js';

// ---- Minimal types for testing ----

const Uint256 = fixedOpaque(32);

const PublicKeyType = xdrEnum({ ed25519: 0 });
type PublicKey = { readonly ed25519: Uint8Array };
const RawPublicKey: XdrCodec<PublicKey> = taggedUnion({
  switchOn: PublicKeyType,
  arms: [{ tags: ['ed25519'], codec: Uint256 }],
}) as XdrCodec<PublicKey>;

const CryptoKeyType = xdrEnum({ ed25519: 0, muxed_ed25519: 0x100 });
interface MuxedAccountMed25519 {
  readonly id: bigint;
  readonly ed25519: Uint8Array;
}
const MuxedAccountMed25519: XdrCodec<MuxedAccountMed25519> =
  xdrStruct<MuxedAccountMed25519>([
    ['id', uint64],
    ['ed25519', Uint256],
  ]);
type MuxedAccount =
  | { readonly ed25519: Uint8Array }
  | { readonly muxed_ed25519: MuxedAccountMed25519 };
const RawMuxedAccount: XdrCodec<MuxedAccount> = taggedUnion({
  switchOn: CryptoKeyType,
  arms: [
    { tags: ['ed25519'], codec: Uint256 },
    { tags: ['muxed_ed25519'], codec: MuxedAccountMed25519 },
  ],
}) as XdrCodec<MuxedAccount>;

// ============================================================
// jsonAs
// ============================================================

describe('jsonAs', () => {
  it('overrides JSON without affecting binary', () => {
    const inner = fixedOpaque(4);
    const wrapped = jsonAs(inner, {
      toJsonValue: (bytes: Uint8Array) =>
        Array.from(bytes)
          .map((b) => String.fromCharCode(b))
          .join(''),
      fromJsonValue: (json: unknown) => {
        const str = json as string;
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
        return bytes;
      },
    });

    const data = new Uint8Array([65, 66, 67, 68]); // "ABCD"

    // Binary roundtrip unchanged
    const xdr = wrapped.toXdr(data);
    expect(wrapped.fromXdr(xdr)).toEqual(data);
    expect(xdr).toEqual(inner.toXdr(data));

    // JSON uses override
    expect(wrapped.toJsonValue(data)).toBe('ABCD');
    expect(wrapped.fromJsonValue('ABCD')).toEqual(data);

    // Full JSON roundtrip
    const json = wrapped.toJson(data);
    expect(wrapped.fromJson(json)).toEqual(data);
  });
});

// ============================================================
// stellarPublicKey / stellarAccountId
// ============================================================

describe('stellarPublicKey', () => {
  const PublicKey = stellarPublicKey(RawPublicKey);

  it('toJsonValue produces G-address', () => {
    const key = new Uint8Array(32);
    const value: PublicKey = { ed25519: key };
    const json = PublicKey.toJsonValue(value);
    expect(typeof json).toBe('string');
    expect((json as string).startsWith('G')).toBe(true);
  });

  it('fromJsonValue parses G-address', () => {
    const key = new Uint8Array(32);
    key[0] = 0x3c;
    key[1] = 0xb3;
    const value: PublicKey = { ed25519: key };
    const strkey = PublicKey.toJsonValue(value) as string;
    const roundtripped = PublicKey.fromJsonValue(strkey);
    expect(roundtripped.ed25519).toEqual(key);
  });

  it('binary encode/decode is unchanged', () => {
    const key = new Uint8Array(32);
    key.fill(0xab);
    const value: PublicKey = { ed25519: key };
    const xdr = PublicKey.toXdr(value);
    const decoded = PublicKey.fromXdr(xdr);
    expect(decoded.ed25519).toEqual(key);
    // Same bytes as raw
    expect(xdr).toEqual(RawPublicKey.toXdr(value));
  });

  it('JSON roundtrip', () => {
    const key = new Uint8Array(32);
    key[5] = 0xff;
    const value: PublicKey = { ed25519: key };
    const json = PublicKey.toJson(value);
    const decoded = PublicKey.fromJson(json);
    expect(decoded.ed25519).toEqual(key);
  });
});

describe('stellarAccountId', () => {
  it('is identical to stellarPublicKey', () => {
    const AccountId = stellarAccountId(RawPublicKey);
    const key = new Uint8Array(32);
    const value: PublicKey = { ed25519: key };
    const json = AccountId.toJsonValue(value);
    expect(typeof json).toBe('string');
    expect((json as string).startsWith('G')).toBe(true);
  });
});

// ============================================================
// stellarMuxedAccount
// ============================================================

describe('stellarMuxedAccount', () => {
  const MuxedAccount = stellarMuxedAccount(RawMuxedAccount);

  it('ed25519 arm produces G-address', () => {
    const key = new Uint8Array(32);
    const value: { ed25519: Uint8Array } = { ed25519: key };
    const json = MuxedAccount.toJsonValue(value) as string;
    expect(json.startsWith('G')).toBe(true);
  });

  it('muxed_ed25519 arm produces M-address', () => {
    const key = new Uint8Array(32);
    key[0] = 0x3c;
    const value = { muxed_ed25519: { id: 123n, ed25519: key } };
    const json = MuxedAccount.toJsonValue(value) as string;
    expect(json.startsWith('M')).toBe(true);
  });

  it('roundtrips G-address through JSON', () => {
    const key = new Uint8Array(32);
    key[0] = 0xaa;
    const value = { ed25519: key };
    const json = MuxedAccount.toJsonValue(value) as string;
    const decoded = MuxedAccount.fromJsonValue(json);
    expect('ed25519' in decoded).toBe(true);
    expect((decoded as { ed25519: Uint8Array }).ed25519).toEqual(key);
  });

  it('roundtrips M-address through JSON', () => {
    const key = new Uint8Array(32);
    key[0] = 0xbb;
    const id = 9876543210n;
    const value = { muxed_ed25519: { id, ed25519: key } };
    const json = MuxedAccount.toJsonValue(value) as string;
    const decoded = MuxedAccount.fromJsonValue(json) as {
      muxed_ed25519: { id: bigint; ed25519: Uint8Array };
    };
    expect(decoded.muxed_ed25519.id).toBe(id);
    expect(decoded.muxed_ed25519.ed25519).toEqual(key);
  });

  it('binary encode/decode is unchanged', () => {
    const key = new Uint8Array(32);
    const value = { ed25519: key };
    const xdr = MuxedAccount.toXdr(value);
    expect(xdr).toEqual(RawMuxedAccount.toXdr(value));
  });
});

// ============================================================
// stellarAssetCode4
// ============================================================

describe('stellarAssetCode4', () => {
  const AssetCode4 = stellarAssetCode4(fixedOpaque(4));

  it('toJsonValue strips trailing NULs', () => {
    // "USD\0" → "USD"
    const bytes = new Uint8Array([85, 83, 68, 0]);
    expect(AssetCode4.toJsonValue(bytes)).toBe('USD');
  });

  it('toJsonValue full 4-byte code', () => {
    // "USDC" → "USDC"
    const bytes = new Uint8Array([85, 83, 68, 67]);
    expect(AssetCode4.toJsonValue(bytes)).toBe('USDC');
  });

  it('fromJsonValue pads with NULs', () => {
    const bytes = AssetCode4.fromJsonValue('USD');
    expect(bytes).toEqual(new Uint8Array([85, 83, 68, 0]));
  });

  it('fromJsonValue full 4 chars', () => {
    const bytes = AssetCode4.fromJsonValue('USDC');
    expect(bytes).toEqual(new Uint8Array([85, 83, 68, 67]));
  });

  it('roundtrips through JSON', () => {
    const original = new Uint8Array([65, 66, 0, 0]); // "AB\0\0"
    const json = AssetCode4.toJsonValue(original);
    expect(json).toBe('AB');
    const roundtripped = AssetCode4.fromJsonValue(json);
    expect(roundtripped).toEqual(original);
  });

  it('binary encode/decode unchanged', () => {
    const inner = fixedOpaque(4);
    const bytes = new Uint8Array([85, 83, 68, 67]);
    expect(AssetCode4.toXdr(bytes)).toEqual(inner.toXdr(bytes));
    expect(AssetCode4.fromXdr(AssetCode4.toXdr(bytes))).toEqual(bytes);
  });
});

// ============================================================
// stellarAssetCode12
// ============================================================

describe('stellarAssetCode12', () => {
  const AssetCode12 = stellarAssetCode12(fixedOpaque(12));

  it('toJsonValue strips trailing NULs', () => {
    const bytes = new Uint8Array(12);
    const code = 'LONGASSET';
    for (let i = 0; i < code.length; i++) bytes[i] = code.charCodeAt(i);
    expect(AssetCode12.toJsonValue(bytes)).toBe('LONGASSET');
  });

  it('fromJsonValue pads to 12 bytes', () => {
    const bytes = AssetCode12.fromJsonValue('LONGASSET');
    expect(bytes.length).toBe(12);
    expect(bytes[0]).toBe('L'.charCodeAt(0));
    expect(bytes[8]).toBe('T'.charCodeAt(0));
    expect(bytes[9]).toBe(0);
    expect(bytes[11]).toBe(0);
  });

  it('roundtrips through JSON', () => {
    const bytes = new Uint8Array(12);
    bytes[0] = 65; // A
    bytes[1] = 66; // B
    bytes[2] = 67; // C
    bytes[3] = 68; // D
    bytes[4] = 69; // E
    const json = AssetCode12.toJsonValue(bytes);
    expect(json).toBe('ABCDE');
    expect(AssetCode12.fromJsonValue(json)).toEqual(bytes);
  });
});
