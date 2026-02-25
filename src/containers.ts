import { BaseCodec, type XdrCodec } from './codec.js';
import { XdrError, XdrErrorCode } from './errors.js';
import { XdrReader } from './reader.js';
import { XdrWriter } from './writer.js';

export function fixedOpaque(n: number): XdrCodec<Uint8Array> {
  return new (class extends BaseCodec<Uint8Array> {
    encode(writer: XdrWriter, value: Uint8Array): void {
      writer.writeFixedOpaque(value, n);
    }
    decode(reader: XdrReader): Uint8Array {
      return reader.readFixedOpaque(n);
    }
  })();
}

export function varOpaque(maxLength?: number): XdrCodec<Uint8Array> {
  return new (class extends BaseCodec<Uint8Array> {
    encode(writer: XdrWriter, value: Uint8Array): void {
      writer.writeVarOpaque(value, maxLength);
    }
    decode(reader: XdrReader): Uint8Array {
      return reader.readVarOpaque(maxLength);
    }
  })();
}

export function xdrString(maxLength?: number): XdrCodec<string> {
  return new (class extends BaseCodec<string> {
    encode(writer: XdrWriter, value: string): void {
      writer.writeString(value, maxLength);
    }
    decode(reader: XdrReader): string {
      return reader.readString(maxLength);
    }
  })();
}

export function fixedArray<T>(
  n: number,
  codec: XdrCodec<T>,
): XdrCodec<readonly T[]> {
  return new (class extends BaseCodec<readonly T[]> {
    encode(writer: XdrWriter, value: readonly T[]): void {
      if (value.length !== n) {
        throw new XdrError(
          XdrErrorCode.LengthMismatch,
          `Fixed array length mismatch: got ${value.length}, expected ${n}`,
        );
      }
      for (let i = 0; i < n; i++) {
        codec.encode(writer, value[i]!);
      }
    }
    decode(reader: XdrReader): readonly T[] {
      const result: T[] = [];
      for (let i = 0; i < n; i++) {
        result.push(codec.decode(reader));
      }
      return result;
    }
  })();
}

export function varArray<T>(
  max: number,
  codec: XdrCodec<T>,
): XdrCodec<readonly T[]> {
  return new (class extends BaseCodec<readonly T[]> {
    encode(writer: XdrWriter, value: readonly T[]): void {
      if (value.length > max) {
        throw new XdrError(
          XdrErrorCode.LengthExceedsMax,
          `Array length ${value.length} exceeds max ${max}`,
        );
      }
      writer.writeUint32(value.length);
      for (let i = 0; i < value.length; i++) {
        codec.encode(writer, value[i]!);
      }
    }
    decode(reader: XdrReader): readonly T[] {
      const len = reader.readUint32();
      if (len > max) {
        throw new XdrError(
          XdrErrorCode.LengthExceedsMax,
          `Array length ${len} exceeds max ${max}`,
        );
      }
      const result: T[] = [];
      for (let i = 0; i < len; i++) {
        result.push(codec.decode(reader));
      }
      return result;
    }
  })();
}

export function option<T>(codec: XdrCodec<T>): XdrCodec<T | undefined> {
  return new (class extends BaseCodec<T | undefined> {
    encode(writer: XdrWriter, value: T | undefined): void {
      if (value === undefined) {
        writer.writeInt32(0);
      } else {
        writer.writeInt32(1);
        codec.encode(writer, value);
      }
    }
    decode(reader: XdrReader): T | undefined {
      const present = reader.readBool();
      if (present) {
        return codec.decode(reader);
      }
      return undefined;
    }
  })();
}
