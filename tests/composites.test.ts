import { describe, it, expect } from 'vitest';
import { xdrStruct, xdrEnum, taggedUnion } from '../src/composites.js';
import { int32, uint32, bool } from '../src/primitives.js';
import { varOpaque, xdrString, option } from '../src/containers.js';
import { XdrErrorCode } from '../src/errors.js';

describe('composites', () => {
  describe('xdrStruct', () => {
    it('roundtrips simple struct', () => {
      interface Price {
        readonly n: number;
        readonly d: number;
      }
      const Price = xdrStruct<Price>([
        ['n', int32],
        ['d', int32],
      ]);
      const val: Price = { n: 1, d: 2 };
      expect(Price.fromXdr(Price.toXdr(val))).toEqual(val);
    });

    it('roundtrips struct with optional field', () => {
      interface Foo {
        readonly x: number;
        readonly y: number | undefined;
      }
      const Foo = xdrStruct<Foo>([
        ['x', int32],
        ['y', option(int32)],
      ]);
      expect(Foo.fromXdr(Foo.toXdr({ x: 1, y: 42 }))).toEqual({
        x: 1,
        y: 42,
      });
      expect(Foo.fromXdr(Foo.toXdr({ x: 1, y: undefined }))).toEqual({
        x: 1,
        y: undefined,
      });
    });

    it('roundtrips nested structs', () => {
      interface Inner {
        readonly val: number;
      }
      interface Outer {
        readonly a: number;
        readonly inner: Inner;
      }
      const Inner = xdrStruct<Inner>([['val', int32]]);
      const Outer = xdrStruct<Outer>([
        ['a', int32],
        ['inner', Inner],
      ]);
      const data: Outer = { a: 10, inner: { val: 20 } };
      expect(Outer.fromXdr(Outer.toXdr(data))).toEqual(data);
    });

    it('encodes fields sequentially in big-endian', () => {
      interface Pair {
        readonly x: number;
        readonly y: number;
      }
      const Pair = xdrStruct<Pair>([
        ['x', uint32],
        ['y', uint32],
      ]);
      const xdr = Pair.toXdr({ x: 1, y: 2 });
      expect(xdr).toEqual(
        new Uint8Array([0, 0, 0, 1, 0, 0, 0, 2]),
      );
    });
  });

  describe('xdrEnum', () => {
    it('has member properties', () => {
      const Color = xdrEnum({ Red: 0, Green: 1, Blue: 2 });
      expect(Color.Red).toBe(0);
      expect(Color.Green).toBe(1);
      expect(Color.Blue).toBe(2);
    });

    it('roundtrips enum values', () => {
      const Color = xdrEnum({ Red: 0, Green: 1, Blue: 2 });
      expect(Color.fromXdr(Color.toXdr('Red'))).toBe('Red');
      expect(Color.fromXdr(Color.toXdr('Green'))).toBe('Green');
      expect(Color.fromXdr(Color.toXdr('Blue'))).toBe('Blue');
    });

    it('encodes as int32', () => {
      const Color = xdrEnum({ Red: 0, Green: 1, Blue: 2 });
      expect(Color.toXdr('Green')).toEqual(new Uint8Array([0, 0, 0, 1]));
    });

    it('rejects unknown enum name on encode', () => {
      const Color = xdrEnum({ Red: 0, Green: 1 });
      expect(() => Color.toXdr('Blue' as any)).toThrow(
        XdrErrorCode.InvalidEnumValue,
      );
    });

    it('rejects unknown numeric value on decode', () => {
      const Color = xdrEnum({ Red: 0, Green: 1 });
      const xdr = int32.toXdr(99);
      expect(() => Color.fromXdr(xdr)).toThrow(XdrErrorCode.InvalidEnumValue);
    });

    it('handles non-contiguous values', () => {
      const Flags = xdrEnum({ A: 0, B: 5, C: 10 });
      expect(Flags.fromXdr(Flags.toXdr('B'))).toBe('B');
    });

    it('base64 roundtrip', () => {
      const Color = xdrEnum({ Red: 0, Green: 1, Blue: 2 });
      const b64 = Color.toBase64('Blue');
      expect(Color.fromBase64(b64)).toBe('Blue');
    });
  });

  describe('taggedUnion', () => {
    describe('enum-discriminated', () => {
      const AssetType = xdrEnum({
        Native: 0,
        CreditAlphanum4: 1,
      });

      interface AlphaNum4 {
        readonly assetCode: Uint8Array;
      }

      const AlphaNum4 = xdrStruct<AlphaNum4>([
        ['assetCode', varOpaque(4)],
      ]);

      type Asset =
        | { readonly tag: 'Native' }
        | { readonly tag: 'CreditAlphanum4'; readonly value: AlphaNum4 };

      const Asset = taggedUnion({
        switchOn: AssetType,
        arms: [
          { tags: ['Native'] },
          { tags: ['CreditAlphanum4'], codec: AlphaNum4 },
        ],
      }) as import('../src/codec.js').XdrCodec<Asset>;

      it('roundtrips void arm', () => {
        const val: Asset = { tag: 'Native' };
        const result = Asset.fromXdr(Asset.toXdr(val));
        expect(result).toEqual({ tag: 'Native' });
        expect('value' in result).toBe(false);
      });

      it('roundtrips value arm', () => {
        const val: Asset = {
          tag: 'CreditAlphanum4',
          value: { assetCode: new Uint8Array([85, 83, 68, 67]) },
        };
        const result = Asset.fromXdr(Asset.toXdr(val));
        expect(result.tag).toBe('CreditAlphanum4');
        expect(
          (result as { tag: 'CreditAlphanum4'; value: AlphaNum4 }).value
            .assetCode,
        ).toEqual(new Uint8Array([85, 83, 68, 67]));
      });
    });

    describe('int-discriminated', () => {
      type Ext =
        | { readonly tag: 0 }
        | { readonly tag: 1; readonly value: number };

      const Ext = taggedUnion({
        switchOn: int32,
        arms: [
          { tags: [0] },
          { tags: [1], codec: uint32 },
        ],
      }) as import('../src/codec.js').XdrCodec<Ext>;

      it('roundtrips void arm', () => {
        const val: Ext = { tag: 0 };
        const result = Ext.fromXdr(Ext.toXdr(val));
        expect(result).toEqual({ tag: 0 });
      });

      it('roundtrips value arm', () => {
        const val: Ext = { tag: 1, value: 999 };
        const result = Ext.fromXdr(Ext.toXdr(val));
        expect(result).toEqual({ tag: 1, value: 999 });
      });
    });

    describe('default arm', () => {
      type MyUnion =
        | { readonly tag: 0 }
        | { readonly tag: number; readonly value: Uint8Array };

      const MyUnion = taggedUnion({
        switchOn: int32,
        arms: [{ tags: [0] }],
        defaultArm: { codec: varOpaque(100) },
      }) as import('../src/codec.js').XdrCodec<MyUnion>;

      it('roundtrips known arm', () => {
        const val: MyUnion = { tag: 0 };
        expect(MyUnion.fromXdr(MyUnion.toXdr(val))).toEqual({ tag: 0 });
      });

      it('roundtrips default arm', () => {
        const val: MyUnion = { tag: 42, value: new Uint8Array([1, 2, 3]) };
        const result = MyUnion.fromXdr(MyUnion.toXdr(val));
        expect(result.tag).toBe(42);
        expect((result as { tag: number; value: Uint8Array }).value).toEqual(
          new Uint8Array([1, 2, 3]),
        );
      });
    });

    describe('void default arm', () => {
      const U = taggedUnion({
        switchOn: int32,
        arms: [{ tags: [0], codec: uint32 }],
        defaultArm: {},
      });

      it('default arm with no codec produces void', () => {
        const result = U.fromXdr(U.toXdr({ tag: 99 }));
        expect(result).toEqual({ tag: 99 });
        expect('value' in result).toBe(false);
      });
    });

    it('rejects unknown discriminant without default', () => {
      const U = taggedUnion({
        switchOn: int32,
        arms: [{ tags: [0] }],
      });
      expect(() => U.toXdr({ tag: 99 })).toThrow(
        XdrErrorCode.InvalidUnionDiscriminant,
      );
    });

    describe('multiple tags per arm', () => {
      const U = taggedUnion({
        switchOn: int32,
        arms: [
          { tags: [1, 2, 3], codec: xdrString(100) },
          { tags: [0] },
        ],
      });

      it('all tags in the same arm work', () => {
        expect(U.fromXdr(U.toXdr({ tag: 1, value: 'a' }))).toEqual({
          tag: 1,
          value: 'a',
        });
        expect(U.fromXdr(U.toXdr({ tag: 2, value: 'b' }))).toEqual({
          tag: 2,
          value: 'b',
        });
        expect(U.fromXdr(U.toXdr({ tag: 3, value: 'c' }))).toEqual({
          tag: 3,
          value: 'c',
        });
      });
    });
  });
});
