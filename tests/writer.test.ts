import { describe, it, expect } from 'vitest';
import { XdrWriter } from '../src/writer.js';
import { XdrReader } from '../src/reader.js';
import { XdrErrorCode } from '../src/errors.js';

describe('XdrWriter', () => {
  describe('writeInt32', () => {
    it('writes zero', () => {
      const w = new XdrWriter();
      w.writeInt32(0);
      expect(w.toUint8Array()).toEqual(new Uint8Array([0, 0, 0, 0]));
    });

    it('writes positive value', () => {
      const w = new XdrWriter();
      w.writeInt32(42);
      expect(w.toUint8Array()).toEqual(new Uint8Array([0, 0, 0, 42]));
    });

    it('writes negative value', () => {
      const w = new XdrWriter();
      w.writeInt32(-1);
      expect(w.toUint8Array()).toEqual(
        new Uint8Array([0xff, 0xff, 0xff, 0xff]),
      );
    });

    it('writes INT32_MIN', () => {
      const w = new XdrWriter();
      w.writeInt32(-2147483648);
      expect(w.toUint8Array()).toEqual(new Uint8Array([0x80, 0, 0, 0]));
    });

    it('writes INT32_MAX', () => {
      const w = new XdrWriter();
      w.writeInt32(2147483647);
      expect(w.toUint8Array()).toEqual(
        new Uint8Array([0x7f, 0xff, 0xff, 0xff]),
      );
    });

    it('rejects value above INT32_MAX', () => {
      const w = new XdrWriter();
      expect(() => w.writeInt32(2147483648)).toThrow(
        XdrErrorCode.InvalidValue,
      );
    });

    it('rejects value below INT32_MIN', () => {
      const w = new XdrWriter();
      expect(() => w.writeInt32(-2147483649)).toThrow(
        XdrErrorCode.InvalidValue,
      );
    });

    it('rejects non-integer', () => {
      const w = new XdrWriter();
      expect(() => w.writeInt32(1.5)).toThrow(XdrErrorCode.InvalidValue);
    });
  });

  describe('writeUint32', () => {
    it('writes zero', () => {
      const w = new XdrWriter();
      w.writeUint32(0);
      expect(w.toUint8Array()).toEqual(new Uint8Array([0, 0, 0, 0]));
    });

    it('writes UINT32_MAX', () => {
      const w = new XdrWriter();
      w.writeUint32(4294967295);
      expect(w.toUint8Array()).toEqual(
        new Uint8Array([0xff, 0xff, 0xff, 0xff]),
      );
    });

    it('rejects negative value', () => {
      const w = new XdrWriter();
      expect(() => w.writeUint32(-1)).toThrow(XdrErrorCode.InvalidValue);
    });

    it('rejects value above UINT32_MAX', () => {
      const w = new XdrWriter();
      expect(() => w.writeUint32(4294967296)).toThrow(
        XdrErrorCode.InvalidValue,
      );
    });
  });

  describe('writeInt64', () => {
    it('writes zero', () => {
      const w = new XdrWriter();
      w.writeInt64(0n);
      expect(w.toUint8Array()).toEqual(
        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
      );
    });

    it('writes positive value', () => {
      const w = new XdrWriter();
      w.writeInt64(1n);
      expect(w.toUint8Array()).toEqual(
        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]),
      );
    });

    it('writes negative value', () => {
      const w = new XdrWriter();
      w.writeInt64(-1n);
      expect(w.toUint8Array()).toEqual(
        new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
      );
    });

    it('rejects value above INT64_MAX', () => {
      const w = new XdrWriter();
      expect(() => w.writeInt64(2n ** 63n)).toThrow(
        XdrErrorCode.InvalidValue,
      );
    });

    it('rejects value below INT64_MIN', () => {
      const w = new XdrWriter();
      expect(() => w.writeInt64(-(2n ** 63n) - 1n)).toThrow(
        XdrErrorCode.InvalidValue,
      );
    });
  });

  describe('writeUint64', () => {
    it('writes zero', () => {
      const w = new XdrWriter();
      w.writeUint64(0n);
      expect(w.toUint8Array()).toEqual(
        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
      );
    });

    it('writes max value', () => {
      const w = new XdrWriter();
      w.writeUint64(2n ** 64n - 1n);
      expect(w.toUint8Array()).toEqual(
        new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
      );
    });

    it('rejects negative value', () => {
      const w = new XdrWriter();
      expect(() => w.writeUint64(-1n)).toThrow(XdrErrorCode.InvalidValue);
    });
  });

  describe('writeFloat32', () => {
    it('roundtrips 1.0', () => {
      const w = new XdrWriter();
      w.writeFloat32(1.0);
      const r = new XdrReader(w.toUint8Array());
      expect(r.readFloat32()).toBeCloseTo(1.0, 5);
    });
  });

  describe('writeFloat64', () => {
    it('roundtrips PI', () => {
      const w = new XdrWriter();
      w.writeFloat64(Math.PI);
      const r = new XdrReader(w.toUint8Array());
      expect(r.readFloat64()).toBe(Math.PI);
    });
  });

  describe('writeBool', () => {
    it('writes false as 0', () => {
      const w = new XdrWriter();
      w.writeBool(false);
      expect(w.toUint8Array()).toEqual(new Uint8Array([0, 0, 0, 0]));
    });

    it('writes true as 1', () => {
      const w = new XdrWriter();
      w.writeBool(true);
      expect(w.toUint8Array()).toEqual(new Uint8Array([0, 0, 0, 1]));
    });
  });

  describe('writeFixedOpaque', () => {
    it('writes with no padding needed', () => {
      const w = new XdrWriter();
      w.writeFixedOpaque(new Uint8Array([1, 2, 3, 4]), 4);
      expect(w.toUint8Array()).toEqual(new Uint8Array([1, 2, 3, 4]));
    });

    it('writes with padding', () => {
      const w = new XdrWriter();
      w.writeFixedOpaque(new Uint8Array([1, 2]), 2);
      expect(w.toUint8Array()).toEqual(new Uint8Array([1, 2, 0, 0]));
    });

    it('rejects wrong length', () => {
      const w = new XdrWriter();
      expect(() => w.writeFixedOpaque(new Uint8Array([1, 2, 3]), 4)).toThrow(
        XdrErrorCode.LengthMismatch,
      );
    });
  });

  describe('writeVarOpaque', () => {
    it('writes empty', () => {
      const w = new XdrWriter();
      w.writeVarOpaque(new Uint8Array([]));
      expect(w.toUint8Array()).toEqual(new Uint8Array([0, 0, 0, 0]));
    });

    it('writes with length prefix and padding', () => {
      const w = new XdrWriter();
      w.writeVarOpaque(new Uint8Array([0xaa, 0xbb, 0xcc]));
      expect(w.toUint8Array()).toEqual(
        new Uint8Array([0, 0, 0, 3, 0xaa, 0xbb, 0xcc, 0]),
      );
    });

    it('rejects data exceeding max', () => {
      const w = new XdrWriter();
      expect(() =>
        w.writeVarOpaque(new Uint8Array([1, 2, 3, 4, 5]), 4),
      ).toThrow(XdrErrorCode.LengthExceedsMax);
    });
  });

  describe('writeString', () => {
    it('writes ASCII string', () => {
      const w = new XdrWriter();
      w.writeString('Hi');
      expect(w.toUint8Array()).toEqual(
        new Uint8Array([0, 0, 0, 2, 0x48, 0x69, 0, 0]),
      );
    });

    it('rejects string exceeding max bytes', () => {
      const w = new XdrWriter();
      expect(() => w.writeString('Hello', 4)).toThrow(
        XdrErrorCode.LengthExceedsMax,
      );
    });
  });

  describe('buffer growth', () => {
    it('grows buffer automatically', () => {
      const w = new XdrWriter(4); // start small
      w.writeInt32(1);
      w.writeInt32(2);
      w.writeInt32(3);
      const result = w.toUint8Array();
      expect(result.length).toBe(12);
      const r = new XdrReader(result);
      expect(r.readInt32()).toBe(1);
      expect(r.readInt32()).toBe(2);
      expect(r.readInt32()).toBe(3);
    });
  });

  describe('offset tracking', () => {
    it('tracks write position', () => {
      const w = new XdrWriter();
      expect(w.offset).toBe(0);
      w.writeInt32(0);
      expect(w.offset).toBe(4);
      w.writeInt64(0n);
      expect(w.offset).toBe(12);
    });
  });
});
