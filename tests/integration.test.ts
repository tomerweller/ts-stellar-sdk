import { describe, it, expect } from 'vitest';
import {
  int32,
  uint32,
  uint64,
  bool,
  xdrVoid,
  fixedOpaque,
  varOpaque,
  xdrString,
  fixedArray,
  varArray,
  option,
  xdrStruct,
  xdrEnum,
  taggedUnion,
  XdrError,
  XdrErrorCode,
  encodeBase64,
  decodeBase64,
  type XdrCodec,
} from '../src/index.js';

describe('integration', () => {
  // Simulate generated Stellar types

  const AssetType = xdrEnum({
    Native: 0,
    CreditAlphanum4: 1,
    CreditAlphanum12: 2,
  });

  interface AlphaNum4 {
    readonly assetCode: Uint8Array;
    readonly issuer: Uint8Array;
  }
  const AlphaNum4: XdrCodec<AlphaNum4> = xdrStruct<AlphaNum4>([
    ['assetCode', fixedOpaque(4)],
    ['issuer', fixedOpaque(32)],
  ]);

  interface AlphaNum12 {
    readonly assetCode: Uint8Array;
    readonly issuer: Uint8Array;
  }
  const AlphaNum12: XdrCodec<AlphaNum12> = xdrStruct<AlphaNum12>([
    ['assetCode', fixedOpaque(12)],
    ['issuer', fixedOpaque(32)],
  ]);

  type Asset =
    | { readonly tag: 'Native' }
    | { readonly tag: 'CreditAlphanum4'; readonly value: AlphaNum4 }
    | { readonly tag: 'CreditAlphanum12'; readonly value: AlphaNum12 };

  const Asset: XdrCodec<Asset> = taggedUnion({
    switchOn: AssetType,
    arms: [
      { tags: ['Native'] },
      { tags: ['CreditAlphanum4'], codec: AlphaNum4 },
      { tags: ['CreditAlphanum12'], codec: AlphaNum12 },
    ],
  }) as XdrCodec<Asset>;

  describe('Asset union', () => {
    it('roundtrips Native', () => {
      const native: Asset = { tag: 'Native' };
      const xdr = Asset.toXdr(native);
      const decoded = Asset.fromXdr(xdr);
      expect(decoded).toEqual({ tag: 'Native' });
    });

    it('roundtrips CreditAlphanum4', () => {
      const usdc: Asset = {
        tag: 'CreditAlphanum4',
        value: {
          assetCode: new Uint8Array([85, 83, 68, 67]), // USDC
          issuer: new Uint8Array(32),
        },
      };
      const decoded = Asset.fromXdr(Asset.toXdr(usdc));
      expect(decoded.tag).toBe('CreditAlphanum4');
      expect(
        (decoded as { tag: 'CreditAlphanum4'; value: AlphaNum4 }).value
          .assetCode,
      ).toEqual(new Uint8Array([85, 83, 68, 67]));
    });

    it('base64 roundtrip', () => {
      const native: Asset = { tag: 'Native' };
      const b64 = Asset.toBase64(native);
      expect(Asset.fromBase64(b64)).toEqual({ tag: 'Native' });
    });
  });

  describe('enum access pattern', () => {
    it('enum has numeric members', () => {
      expect(AssetType.Native).toBe(0);
      expect(AssetType.CreditAlphanum4).toBe(1);
      expect(AssetType.CreditAlphanum12).toBe(2);
    });

    it('enum encodes/decodes string names', () => {
      expect(AssetType.fromXdr(AssetType.toXdr('Native'))).toBe('Native');
    });
  });

  describe('typedef pattern', () => {
    // typedef opaque Hash[32]
    type Hash = Uint8Array;
    const Hash: XdrCodec<Hash> = fixedOpaque(32);

    // typedef uint64 TimePoint
    type TimePoint = bigint;
    const TimePoint: XdrCodec<TimePoint> = uint64;

    it('Hash roundtrip', () => {
      const hash = new Uint8Array(32);
      hash.fill(0xab);
      expect(Hash.fromXdr(Hash.toXdr(hash))).toEqual(hash);
    });

    it('TimePoint roundtrip', () => {
      const tp: TimePoint = 1234567890n;
      expect(TimePoint.fromXdr(TimePoint.toXdr(tp))).toBe(tp);
    });
  });

  describe('complex struct', () => {
    const MAX_SIGNERS = 20;

    interface Signer {
      readonly key: Uint8Array;
      readonly weight: number;
    }
    const Signer: XdrCodec<Signer> = xdrStruct<Signer>([
      ['key', fixedOpaque(32)],
      ['weight', uint32],
    ]);

    interface AccountEntry {
      readonly accountId: Uint8Array;
      readonly balance: bigint;
      readonly signers: readonly Signer[];
    }
    const AccountEntry: XdrCodec<AccountEntry> = xdrStruct<AccountEntry>([
      ['accountId', fixedOpaque(32)],
      ['balance', uint64],
      ['signers', varArray(MAX_SIGNERS, Signer)],
    ]);

    it('roundtrips complex struct', () => {
      const entry: AccountEntry = {
        accountId: new Uint8Array(32).fill(0x01),
        balance: 10000000n,
        signers: [
          { key: new Uint8Array(32).fill(0x02), weight: 1 },
          { key: new Uint8Array(32).fill(0x03), weight: 2 },
        ],
      };
      const decoded = AccountEntry.fromXdr(AccountEntry.toXdr(entry));
      expect(decoded.accountId).toEqual(entry.accountId);
      expect(decoded.balance).toBe(entry.balance);
      expect(decoded.signers.length).toBe(2);
      expect(decoded.signers[0]!.weight).toBe(1);
      expect(decoded.signers[1]!.weight).toBe(2);
    });
  });

  describe('error handling', () => {
    it('XdrError has correct code', () => {
      try {
        int32.fromXdr(new Uint8Array([0, 0]));
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(XdrError);
        expect((err as XdrError).code).toBe(XdrErrorCode.BufferUnderflow);
      }
    });

    it('rejects extra trailing bytes', () => {
      expect(() =>
        uint32.fromXdr(new Uint8Array([0, 0, 0, 1, 0, 0, 0, 2])),
      ).toThrow(XdrErrorCode.BufferNotFullyConsumed);
    });
  });

  describe('limits', () => {
    it('rejects on byte limit exceeded', () => {
      expect(() =>
        int32.fromXdr(new Uint8Array([0, 0, 0, 1]), { depth: 512, len: 2 }),
      ).toThrow(XdrErrorCode.ByteLimitExceeded);
    });

    it('rejects deeply nested structs', () => {
      // Create a chain of structs 3 deep but with depth limit 2
      interface Inner {
        readonly x: number;
      }
      interface Middle {
        readonly inner: Inner;
      }
      interface Outer {
        readonly middle: Middle;
      }
      const Inner: XdrCodec<Inner> = xdrStruct<Inner>([['x', int32]]);
      const Middle: XdrCodec<Middle> = xdrStruct<Middle>([
        ['inner', Inner],
      ]);
      const Outer: XdrCodec<Outer> = xdrStruct<Outer>([
        ['middle', Middle],
      ]);

      const val: Outer = { middle: { inner: { x: 42 } } };
      // Should succeed with default limits
      expect(Outer.fromXdr(Outer.toXdr(val))).toEqual(val);
      // Should fail with depth=2 (Outer->Middle->Inner = 3 nesting levels)
      expect(() =>
        Outer.fromXdr(Outer.toXdr(val), { depth: 2, len: 256 * 1024 * 1024 }),
      ).toThrow(XdrErrorCode.DepthLimitExceeded);
    });
  });

  describe('base64 utilities', () => {
    it('roundtrips', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      expect(decodeBase64(encodeBase64(data))).toEqual(data);
    });

    it('handles whitespace in base64 input', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const b64 = encodeBase64(data);
      // Add whitespace
      const withWhitespace = ' ' + b64.slice(0, 2) + '\n' + b64.slice(2) + ' ';
      expect(decodeBase64(withWhitespace)).toEqual(data);
    });
  });

  describe('edge cases from rs-stellar-xdr', () => {
    it('two uint32s concatenated: fails as uint32, succeeds as uint64', () => {
      const twoU32s = new Uint8Array([
        ...uint32.toXdr(1),
        ...uint32.toXdr(2),
      ]);
      expect(() => uint32.fromXdr(twoU32s)).toThrow(
        XdrErrorCode.BufferNotFullyConsumed,
      );
      // As uint64: (1 << 32) | 2 = 4294967298
      expect(uint64.fromXdr(twoU32s)).toBe((1n << 32n) | 2n);
    });

    it('empty buffer fails for int32', () => {
      expect(() => int32.fromXdr(new Uint8Array([]))).toThrow(
        XdrErrorCode.BufferUnderflow,
      );
    });

    it('default uint32 is 0', () => {
      expect(uint32.fromXdr(new Uint8Array([0, 0, 0, 0]))).toBe(0);
    });
  });
});
