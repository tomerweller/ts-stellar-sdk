import { XdrError, XdrErrorCode } from './errors.js';
import { type Limits, DEFAULT_LIMITS, LimitTracker } from './limits.js';

const textDecoder = new TextDecoder('utf-8', { fatal: true });

export class XdrReader {
  private readonly data: Uint8Array;
  private readonly view: DataView;
  private pos: number = 0;
  readonly limits: LimitTracker;

  constructor(input: Uint8Array, limits?: Limits) {
    this.data = input;
    this.view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    this.limits = new LimitTracker(limits ?? DEFAULT_LIMITS);
  }

  get offset(): number {
    return this.pos;
  }

  get remaining(): number {
    return this.data.length - this.pos;
  }

  readInt32(): number {
    this.ensureAvailable(4);
    this.limits.consumeLen(4);
    const val = this.view.getInt32(this.pos);
    this.pos += 4;
    return val;
  }

  readUint32(): number {
    this.ensureAvailable(4);
    this.limits.consumeLen(4);
    const val = this.view.getUint32(this.pos);
    this.pos += 4;
    return val;
  }

  readInt64(): bigint {
    this.ensureAvailable(8);
    this.limits.consumeLen(8);
    const val = this.view.getBigInt64(this.pos);
    this.pos += 8;
    return val;
  }

  readUint64(): bigint {
    this.ensureAvailable(8);
    this.limits.consumeLen(8);
    const val = this.view.getBigUint64(this.pos);
    this.pos += 8;
    return val;
  }

  readFloat32(): number {
    this.ensureAvailable(4);
    this.limits.consumeLen(4);
    const val = this.view.getFloat32(this.pos);
    this.pos += 4;
    return val;
  }

  readFloat64(): number {
    this.ensureAvailable(8);
    this.limits.consumeLen(8);
    const val = this.view.getFloat64(this.pos);
    this.pos += 8;
    return val;
  }

  readBool(): boolean {
    const val = this.readInt32();
    if (val === 0) return false;
    if (val === 1) return true;
    throw new XdrError(
      XdrErrorCode.InvalidValue,
      `Invalid bool value: ${val}`,
    );
  }

  readFixedOpaque(n: number): Uint8Array {
    this.ensureAvailable(n + pad(n));
    this.limits.consumeLen(n + pad(n));
    const result = this.data.slice(this.pos, this.pos + n);
    this.pos += n;
    this.validatePadding(pad(n));
    return result;
  }

  readVarOpaque(maxLength?: number): Uint8Array {
    const len = this.readUint32();
    if (maxLength !== undefined && len > maxLength) {
      throw new XdrError(
        XdrErrorCode.LengthExceedsMax,
        `Opaque length ${len} exceeds max ${maxLength}`,
      );
    }
    this.ensureAvailable(len + pad(len));
    this.limits.consumeLen(len + pad(len));
    const result = this.data.slice(this.pos, this.pos + len);
    this.pos += len;
    this.validatePadding(pad(len));
    return result;
  }

  readString(maxLength?: number): string {
    const bytes = this.readVarOpaque(maxLength);
    try {
      return textDecoder.decode(bytes);
    } catch {
      throw new XdrError(XdrErrorCode.Utf8Error, 'Invalid UTF-8 in string');
    }
  }

  readPadding(n: number): void {
    this.validatePadding(n);
  }

  readBytes(n: number): Uint8Array {
    this.ensureAvailable(n);
    this.limits.consumeLen(n);
    const result = this.data.slice(this.pos, this.pos + n);
    this.pos += n;
    return result;
  }

  ensureEnd(): void {
    if (this.pos !== this.data.length) {
      throw new XdrError(
        XdrErrorCode.BufferNotFullyConsumed,
        `Buffer not fully consumed: ${this.data.length - this.pos} bytes remaining`,
      );
    }
  }

  private ensureAvailable(n: number): void {
    if (this.pos + n > this.data.length) {
      throw new XdrError(
        XdrErrorCode.BufferUnderflow,
        `Buffer underflow: need ${n} bytes, have ${this.data.length - this.pos}`,
      );
    }
  }

  private validatePadding(n: number): void {
    for (let i = 0; i < n; i++) {
      if (this.data[this.pos + i] !== 0) {
        throw new XdrError(
          XdrErrorCode.NonZeroPadding,
          `Non-zero padding byte at offset ${this.pos + i}`,
        );
      }
    }
    this.pos += n;
  }
}

function pad(n: number): number {
  const remainder = n % 4;
  return remainder === 0 ? 0 : 4 - remainder;
}
