import { describe, it, expect } from 'vitest';
import { XdrReader } from '../src/reader.js';
import { XdrErrorCode } from '../src/errors.js';

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

describe('XdrReader', () => {
  describe('readInt32', () => {
    it('reads zero', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0));
      expect(r.readInt32()).toBe(0);
    });

    it('reads positive value', () => {
      const r = new XdrReader(bytes(0, 0, 0, 42));
      expect(r.readInt32()).toBe(42);
    });

    it('reads negative value', () => {
      // -1 in big-endian two's complement
      const r = new XdrReader(bytes(0xff, 0xff, 0xff, 0xff));
      expect(r.readInt32()).toBe(-1);
    });

    it('reads INT32_MIN', () => {
      const r = new XdrReader(bytes(0x80, 0, 0, 0));
      expect(r.readInt32()).toBe(-2147483648);
    });

    it('reads INT32_MAX', () => {
      const r = new XdrReader(bytes(0x7f, 0xff, 0xff, 0xff));
      expect(r.readInt32()).toBe(2147483647);
    });
  });

  describe('readUint32', () => {
    it('reads zero', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0));
      expect(r.readUint32()).toBe(0);
    });

    it('reads UINT32_MAX', () => {
      const r = new XdrReader(bytes(0xff, 0xff, 0xff, 0xff));
      expect(r.readUint32()).toBe(4294967295);
    });
  });

  describe('readInt64', () => {
    it('reads zero', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0, 0, 0, 0, 0));
      expect(r.readInt64()).toBe(0n);
    });

    it('reads positive value', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0, 0, 0, 0, 1));
      expect(r.readInt64()).toBe(1n);
    });

    it('reads negative value', () => {
      const r = new XdrReader(
        bytes(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff),
      );
      expect(r.readInt64()).toBe(-1n);
    });
  });

  describe('readUint64', () => {
    it('reads zero', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0, 0, 0, 0, 0));
      expect(r.readUint64()).toBe(0n);
    });

    it('reads max value', () => {
      const r = new XdrReader(
        bytes(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff),
      );
      expect(r.readUint64()).toBe(18446744073709551615n);
    });
  });

  describe('readFloat32', () => {
    it('reads 1.0', () => {
      // IEEE 754: 1.0 = 0x3F800000
      const r = new XdrReader(bytes(0x3f, 0x80, 0, 0));
      expect(r.readFloat32()).toBeCloseTo(1.0, 5);
    });
  });

  describe('readFloat64', () => {
    it('reads 1.0', () => {
      // IEEE 754: 1.0 = 0x3FF0000000000000
      const r = new XdrReader(bytes(0x3f, 0xf0, 0, 0, 0, 0, 0, 0));
      expect(r.readFloat64()).toBe(1.0);
    });
  });

  describe('readBool', () => {
    it('reads false', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0));
      expect(r.readBool()).toBe(false);
    });

    it('reads true', () => {
      const r = new XdrReader(bytes(0, 0, 0, 1));
      expect(r.readBool()).toBe(true);
    });

    it('rejects invalid bool value', () => {
      const r = new XdrReader(bytes(0, 0, 0, 2));
      expect(() => r.readBool()).toThrow(XdrErrorCode.InvalidValue);
    });
  });

  describe('readFixedOpaque', () => {
    it('reads without padding', () => {
      const r = new XdrReader(bytes(0xaa, 0xbb, 0xcc, 0xdd));
      expect(r.readFixedOpaque(4)).toEqual(bytes(0xaa, 0xbb, 0xcc, 0xdd));
    });

    it('reads with padding', () => {
      const r = new XdrReader(bytes(0xaa, 0xbb, 0, 0));
      expect(r.readFixedOpaque(2)).toEqual(bytes(0xaa, 0xbb));
    });

    it('rejects non-zero padding', () => {
      const r = new XdrReader(bytes(0xaa, 0xbb, 0, 1));
      expect(() => r.readFixedOpaque(2)).toThrow(XdrErrorCode.NonZeroPadding);
    });
  });

  describe('readVarOpaque', () => {
    it('reads empty', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0));
      expect(r.readVarOpaque()).toEqual(bytes());
    });

    it('reads with length and padding', () => {
      // length=3, data=0xAA,0xBB,0xCC, padding=0x00
      const r = new XdrReader(bytes(0, 0, 0, 3, 0xaa, 0xbb, 0xcc, 0));
      expect(r.readVarOpaque()).toEqual(bytes(0xaa, 0xbb, 0xcc));
    });

    it('rejects length exceeding max', () => {
      const r = new XdrReader(bytes(0, 0, 0, 5, 1, 2, 3, 4, 5, 0, 0, 0));
      expect(() => r.readVarOpaque(4)).toThrow(XdrErrorCode.LengthExceedsMax);
    });
  });

  describe('readString', () => {
    it('reads ASCII string', () => {
      // "Hi" = length 2, bytes 0x48 0x69, padding 00 00
      const r = new XdrReader(bytes(0, 0, 0, 2, 0x48, 0x69, 0, 0));
      expect(r.readString()).toBe('Hi');
    });

    it('reads UTF-8 string', () => {
      // "é" = 0xC3 0xA9 in UTF-8
      const r = new XdrReader(bytes(0, 0, 0, 2, 0xc3, 0xa9, 0, 0));
      expect(r.readString()).toBe('é');
    });

    it('rejects invalid UTF-8', () => {
      const r = new XdrReader(bytes(0, 0, 0, 1, 0xff, 0, 0, 0));
      expect(() => r.readString()).toThrow(XdrErrorCode.Utf8Error);
    });
  });

  describe('buffer management', () => {
    it('tracks offset', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0, 0, 0, 0, 0));
      expect(r.offset).toBe(0);
      r.readInt32();
      expect(r.offset).toBe(4);
      r.readInt32();
      expect(r.offset).toBe(8);
    });

    it('tracks remaining', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0, 0, 0, 0, 0));
      expect(r.remaining).toBe(8);
      r.readInt32();
      expect(r.remaining).toBe(4);
    });

    it('throws on underflow', () => {
      const r = new XdrReader(bytes(0, 0));
      expect(() => r.readInt32()).toThrow(XdrErrorCode.BufferUnderflow);
    });

    it('ensureEnd succeeds when fully consumed', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0));
      r.readInt32();
      expect(() => r.ensureEnd()).not.toThrow();
    });

    it('ensureEnd throws when bytes remain', () => {
      const r = new XdrReader(bytes(0, 0, 0, 0, 0, 0, 0, 0));
      r.readInt32();
      expect(() => r.ensureEnd()).toThrow(
        XdrErrorCode.BufferNotFullyConsumed,
      );
    });
  });

  describe('readBytes', () => {
    it('reads raw bytes without padding', () => {
      const r = new XdrReader(bytes(1, 2, 3));
      expect(r.readBytes(3)).toEqual(bytes(1, 2, 3));
    });
  });
});
