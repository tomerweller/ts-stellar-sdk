import { type Limits } from './limits.js';
import { XdrReader } from './reader.js';
import { XdrWriter } from './writer.js';
import { encodeBase64, decodeBase64 } from './base64.js';

export interface XdrCodec<T> {
  encode(writer: XdrWriter, value: T): void;
  decode(reader: XdrReader): T;
  toXdr(value: T, limits?: Limits): Uint8Array;
  fromXdr(input: Uint8Array | ArrayBufferLike, limits?: Limits): T;
  toBase64(value: T, limits?: Limits): string;
  fromBase64(input: string, limits?: Limits): T;
}

export abstract class BaseCodec<T> implements XdrCodec<T> {
  abstract encode(writer: XdrWriter, value: T): void;
  abstract decode(reader: XdrReader): T;

  toXdr(value: T, limits?: Limits): Uint8Array {
    const writer = new XdrWriter(undefined, limits);
    this.encode(writer, value);
    return writer.toUint8Array();
  }

  fromXdr(input: Uint8Array | ArrayBufferLike, limits?: Limits): T {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const reader = new XdrReader(bytes, limits);
    const result = this.decode(reader);
    reader.ensureEnd();
    return result;
  }

  toBase64(value: T, limits?: Limits): string {
    return encodeBase64(this.toXdr(value, limits));
  }

  fromBase64(input: string, limits?: Limits): T {
    return this.fromXdr(decodeBase64(input), limits);
  }
}
