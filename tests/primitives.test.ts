import { describe, it, expect } from 'vitest';
import {
  int32,
  uint32,
  int64,
  uint64,
  float32,
  float64,
  bool,
  xdrVoid,
} from '../src/primitives.js';
import { XdrErrorCode } from '../src/errors.js';

describe('primitives', () => {
  describe('int32', () => {
    it('roundtrips zero', () => {
      expect(int32.fromXdr(int32.toXdr(0))).toBe(0);
    });

    it('roundtrips positive', () => {
      expect(int32.fromXdr(int32.toXdr(12345))).toBe(12345);
    });

    it('roundtrips negative', () => {
      expect(int32.fromXdr(int32.toXdr(-42))).toBe(-42);
    });

    it('roundtrips INT32_MIN', () => {
      expect(int32.fromXdr(int32.toXdr(-2147483648))).toBe(-2147483648);
    });

    it('roundtrips INT32_MAX', () => {
      expect(int32.fromXdr(int32.toXdr(2147483647))).toBe(2147483647);
    });

    it('rejects overflow', () => {
      expect(() => int32.toXdr(2147483648)).toThrow(
        XdrErrorCode.InvalidValue,
      );
    });

    it('base64 roundtrip', () => {
      const b64 = int32.toBase64(42);
      expect(int32.fromBase64(b64)).toBe(42);
    });
  });

  describe('uint32', () => {
    it('roundtrips zero', () => {
      expect(uint32.fromXdr(uint32.toXdr(0))).toBe(0);
    });

    it('roundtrips UINT32_MAX', () => {
      expect(uint32.fromXdr(uint32.toXdr(4294967295))).toBe(4294967295);
    });

    it('rejects negative', () => {
      expect(() => uint32.toXdr(-1)).toThrow(XdrErrorCode.InvalidValue);
    });
  });

  describe('int64', () => {
    it('roundtrips zero', () => {
      expect(int64.fromXdr(int64.toXdr(0n))).toBe(0n);
    });

    it('roundtrips large positive', () => {
      const val = 2n ** 62n;
      expect(int64.fromXdr(int64.toXdr(val))).toBe(val);
    });

    it('roundtrips negative', () => {
      expect(int64.fromXdr(int64.toXdr(-1000n))).toBe(-1000n);
    });

    it('roundtrips INT64_MIN', () => {
      const min = -(2n ** 63n);
      expect(int64.fromXdr(int64.toXdr(min))).toBe(min);
    });

    it('roundtrips INT64_MAX', () => {
      const max = 2n ** 63n - 1n;
      expect(int64.fromXdr(int64.toXdr(max))).toBe(max);
    });
  });

  describe('uint64', () => {
    it('roundtrips zero', () => {
      expect(uint64.fromXdr(uint64.toXdr(0n))).toBe(0n);
    });

    it('roundtrips UINT64_MAX', () => {
      const max = 2n ** 64n - 1n;
      expect(uint64.fromXdr(uint64.toXdr(max))).toBe(max);
    });

    it('rejects negative', () => {
      expect(() => uint64.toXdr(-1n)).toThrow(XdrErrorCode.InvalidValue);
    });
  });

  describe('float32', () => {
    it('roundtrips 1.0', () => {
      expect(float32.fromXdr(float32.toXdr(1.0))).toBeCloseTo(1.0, 5);
    });

    it('roundtrips 0.0', () => {
      expect(float32.fromXdr(float32.toXdr(0.0))).toBe(0.0);
    });

    it('roundtrips -3.14', () => {
      expect(float32.fromXdr(float32.toXdr(-3.14))).toBeCloseTo(-3.14, 2);
    });
  });

  describe('float64', () => {
    it('roundtrips PI', () => {
      expect(float64.fromXdr(float64.toXdr(Math.PI))).toBe(Math.PI);
    });

    it('roundtrips very small value', () => {
      const val = 1e-300;
      expect(float64.fromXdr(float64.toXdr(val))).toBe(val);
    });
  });

  describe('bool', () => {
    it('roundtrips true', () => {
      expect(bool.fromXdr(bool.toXdr(true))).toBe(true);
    });

    it('roundtrips false', () => {
      expect(bool.fromXdr(bool.toXdr(false))).toBe(false);
    });

    it('encodes true as 0x00000001', () => {
      expect(bool.toXdr(true)).toEqual(new Uint8Array([0, 0, 0, 1]));
    });

    it('encodes false as 0x00000000', () => {
      expect(bool.toXdr(false)).toEqual(new Uint8Array([0, 0, 0, 0]));
    });
  });

  describe('xdrVoid', () => {
    it('encodes to empty bytes', () => {
      expect(xdrVoid.toXdr(undefined)).toEqual(new Uint8Array([]));
    });

    it('decodes from empty bytes', () => {
      expect(xdrVoid.fromXdr(new Uint8Array([]))).toBeUndefined();
    });
  });

  describe('fromXdr with ArrayBufferLike', () => {
    it('accepts ArrayBuffer', () => {
      const xdr = int32.toXdr(42);
      expect(int32.fromXdr(xdr.buffer)).toBe(42);
    });
  });
});
