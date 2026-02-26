/**
 * Stellar domain-specific codec factories.
 *
 * These wrap base XDR codecs with JSON representations that match
 * rs-stellar-xdr behavior: PublicKey/AccountId → G-address, MuxedAccount →
 * G/M-address, AssetCode4/AssetCode12 → ASCII strings.
 */
import { type XdrCodec } from './codec.js';
import { jsonAs } from './composites.js';
import {
  encodeStrkey,
  decodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_MUXED_ED25519,
} from './strkey.js';

// ---- PublicKey / AccountId ----

/**
 * Wraps a PublicKey union codec so JSON produces a G-address strkey string.
 *
 *   toJsonValue({ ed25519: bytes }) → "GA6LGY..."
 *   fromJsonValue("GA6LGY...") → { ed25519: bytes }
 */
export function stellarPublicKey<T>(codec: XdrCodec<T>): XdrCodec<T> {
  return jsonAs(codec, {
    toJsonValue(value: T): unknown {
      const v = value as { readonly ed25519: Uint8Array };
      return encodeStrkey(STRKEY_ED25519_PUBLIC, v.ed25519);
    },
    fromJsonValue(json: unknown): T {
      const str = json as string;
      const { version, payload } = decodeStrkey(str);
      if (version !== STRKEY_ED25519_PUBLIC) {
        throw new Error(
          `Expected ed25519 public key (version ${STRKEY_ED25519_PUBLIC}), got ${version}`,
        );
      }
      return { ed25519: payload } as T;
    },
  });
}

/**
 * Alias for stellarPublicKey — AccountId = PublicKey in Stellar.
 */
export const stellarAccountId = stellarPublicKey;

// ---- MuxedAccount ----

/**
 * Wraps a MuxedAccount union codec:
 *   ed25519 arm → G-address
 *   muxed_ed25519 arm → M-address
 */
export function stellarMuxedAccount<T>(codec: XdrCodec<T>): XdrCodec<T> {
  return jsonAs(codec, {
    toJsonValue(value: T): unknown {
      const v = value as Record<string, any>;
      if ('ed25519' in v) {
        return encodeStrkey(STRKEY_ED25519_PUBLIC, v.ed25519 as Uint8Array);
      }
      if ('muxed_ed25519' in v) {
        const med = v.muxed_ed25519 as { id: bigint; ed25519: Uint8Array };
        // Payload: 32 bytes ed25519 key + 8 bytes big-endian uint64 id
        const payload = new Uint8Array(40);
        payload.set(med.ed25519, 0);
        const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
        view.setBigUint64(32, med.id, false);
        return encodeStrkey(STRKEY_MUXED_ED25519, payload);
      }
      throw new Error('Unknown MuxedAccount arm');
    },
    fromJsonValue(json: unknown): T {
      const str = json as string;
      const { version, payload } = decodeStrkey(str);
      if (version === STRKEY_ED25519_PUBLIC) {
        return { ed25519: payload } as T;
      }
      if (version === STRKEY_MUXED_ED25519) {
        if (payload.length !== 40) {
          throw new Error(
            `Muxed account payload must be 40 bytes, got ${payload.length}`,
          );
        }
        const ed25519 = payload.slice(0, 32);
        const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
        const id = view.getBigUint64(32, false);
        return { muxed_ed25519: { id, ed25519 } } as T;
      }
      throw new Error(
        `Expected ed25519 public key or muxed account, got version ${version}`,
      );
    },
  });
}

// ---- AssetCode4 / AssetCode12 ----

/**
 * Encode bytes to ASCII, trimming trailing NULs and applying SEP-0051-style
 * escaping for non-printable bytes.
 */
function assetBytesToString(bytes: Uint8Array): string {
  // Find last non-NUL byte
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  let result = '';
  for (let i = 0; i < end; i++) {
    const b = bytes[i]!;
    if (b >= 0x20 && b <= 0x7e && b !== 0x5c) {
      result += String.fromCharCode(b);
    } else if (b === 0x5c) {
      result += '\\\\';
    } else {
      result += '\\x' + b.toString(16).padStart(2, '0');
    }
  }
  return result;
}

/**
 * Decode an ASCII asset code string back to bytes, with NUL padding to the
 * target length. Handles SEP-0051 escape sequences.
 */
function stringToAssetBytes(str: string, len: number): Uint8Array {
  const bytes: number[] = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] === '\\' && i + 1 < str.length) {
      const next = str[i + 1]!;
      if (next === '\\') {
        bytes.push(0x5c);
        i += 2;
      } else if (next === 'x' && i + 3 < str.length) {
        bytes.push(parseInt(str.substring(i + 2, i + 4), 16));
        i += 4;
      } else {
        bytes.push(str.charCodeAt(i));
        i++;
      }
    } else {
      bytes.push(str.charCodeAt(i));
      i++;
    }
  }
  const result = new Uint8Array(len);
  result.set(bytes);
  return result;
}

/**
 * Wraps an AssetCode4 fixedOpaque(4) codec so JSON produces an ASCII string
 * instead of hex.
 */
export function stellarAssetCode4<T>(codec: XdrCodec<T>): XdrCodec<T> {
  return jsonAs(codec, {
    toJsonValue(value: T): unknown {
      return assetBytesToString(value as unknown as Uint8Array);
    },
    fromJsonValue(json: unknown): T {
      return stringToAssetBytes(json as string, 4) as unknown as T;
    },
  });
}

/**
 * Wraps an AssetCode12 fixedOpaque(12) codec so JSON produces an ASCII string
 * instead of hex.
 */
export function stellarAssetCode12<T>(codec: XdrCodec<T>): XdrCodec<T> {
  return jsonAs(codec, {
    toJsonValue(value: T): unknown {
      return assetBytesToString(value as unknown as Uint8Array);
    },
    fromJsonValue(json: unknown): T {
      return stringToAssetBytes(json as string, 12) as unknown as T;
    },
  });
}
