import { XdrError, XdrErrorCode } from './errors.js';
import { type Limits, DEFAULT_LIMITS, LimitTracker } from './limits.js';

const textEncoder = new TextEncoder();

const INT32_MIN = -(2 ** 31);
const INT32_MAX = 2 ** 31 - 1;
const UINT32_MAX = 2 ** 32 - 1;
const INT64_MIN = -(2n ** 63n);
const INT64_MAX = 2n ** 63n - 1n;
const UINT64_MAX = 2n ** 64n - 1n;

export class XdrWriter {
  private buf: Uint8Array;
  private view: DataView;
  private pos: number = 0;
  readonly limits: LimitTracker;

  constructor(initialCapacity?: number, limits?: Limits) {
    const cap = initialCapacity ?? 256;
    this.buf = new Uint8Array(cap);
    this.view = new DataView(this.buf.buffer);
    this.limits = new LimitTracker(limits ?? DEFAULT_LIMITS);
  }

  get offset(): number {
    return this.pos;
  }

  writeInt32(value: number): void {
    if (!Number.isInteger(value) || value < INT32_MIN || value > INT32_MAX) {
      throw new XdrError(
        XdrErrorCode.InvalidValue,
        `Invalid int32 value: ${value}`,
      );
    }
    this.ensureCapacity(4);
    this.limits.consumeLen(4);
    this.view.setInt32(this.pos, value);
    this.pos += 4;
  }

  writeUint32(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
      throw new XdrError(
        XdrErrorCode.InvalidValue,
        `Invalid uint32 value: ${value}`,
      );
    }
    this.ensureCapacity(4);
    this.limits.consumeLen(4);
    this.view.setUint32(this.pos, value);
    this.pos += 4;
  }

  writeInt64(value: bigint): void {
    if (value < INT64_MIN || value > INT64_MAX) {
      throw new XdrError(
        XdrErrorCode.InvalidValue,
        `Invalid int64 value: ${value}`,
      );
    }
    this.ensureCapacity(8);
    this.limits.consumeLen(8);
    this.view.setBigInt64(this.pos, value);
    this.pos += 8;
  }

  writeUint64(value: bigint): void {
    if (value < 0n || value > UINT64_MAX) {
      throw new XdrError(
        XdrErrorCode.InvalidValue,
        `Invalid uint64 value: ${value}`,
      );
    }
    this.ensureCapacity(8);
    this.limits.consumeLen(8);
    this.view.setBigUint64(this.pos, value);
    this.pos += 8;
  }

  writeFloat32(value: number): void {
    this.ensureCapacity(4);
    this.limits.consumeLen(4);
    this.view.setFloat32(this.pos, value);
    this.pos += 4;
  }

  writeFloat64(value: number): void {
    this.ensureCapacity(8);
    this.limits.consumeLen(8);
    this.view.setFloat64(this.pos, value);
    this.pos += 8;
  }

  writeBool(value: boolean): void {
    this.writeInt32(value ? 1 : 0);
  }

  writeFixedOpaque(data: Uint8Array, n: number): void {
    if (data.length !== n) {
      throw new XdrError(
        XdrErrorCode.LengthMismatch,
        `Fixed opaque length mismatch: got ${data.length}, expected ${n}`,
      );
    }
    const padding = pad(n);
    this.ensureCapacity(n + padding);
    this.limits.consumeLen(n + padding);
    this.buf.set(data, this.pos);
    this.pos += n;
    this.writePaddingBytes(padding);
  }

  writeVarOpaque(data: Uint8Array, maxLength?: number): void {
    if (maxLength !== undefined && data.length > maxLength) {
      throw new XdrError(
        XdrErrorCode.LengthExceedsMax,
        `Opaque length ${data.length} exceeds max ${maxLength}`,
      );
    }
    this.writeUint32(data.length);
    const padding = pad(data.length);
    this.ensureCapacity(data.length + padding);
    this.limits.consumeLen(data.length + padding);
    this.buf.set(data, this.pos);
    this.pos += data.length;
    this.writePaddingBytes(padding);
  }

  writeString(value: string, maxLength?: number): void {
    const bytes = textEncoder.encode(value);
    if (maxLength !== undefined && bytes.length > maxLength) {
      throw new XdrError(
        XdrErrorCode.LengthExceedsMax,
        `String length ${bytes.length} exceeds max ${maxLength}`,
      );
    }
    this.writeVarOpaque(bytes);
  }

  writePadding(n: number): void {
    this.ensureCapacity(n);
    this.writePaddingBytes(n);
  }

  writeBytes(data: Uint8Array): void {
    this.ensureCapacity(data.length);
    this.limits.consumeLen(data.length);
    this.buf.set(data, this.pos);
    this.pos += data.length;
  }

  toUint8Array(): Uint8Array {
    return this.buf.slice(0, this.pos);
  }

  private ensureCapacity(needed: number): void {
    const required = this.pos + needed;
    if (required <= this.buf.length) return;
    let newSize = this.buf.length;
    while (newSize < required) {
      newSize *= 2;
    }
    const newBuf = new Uint8Array(newSize);
    newBuf.set(this.buf);
    this.buf = newBuf;
    this.view = new DataView(this.buf.buffer);
  }

  private writePaddingBytes(n: number): void {
    for (let i = 0; i < n; i++) {
      this.buf[this.pos + i] = 0;
    }
    this.pos += n;
  }
}

function pad(n: number): number {
  const remainder = n % 4;
  return remainder === 0 ? 0 : 4 - remainder;
}
