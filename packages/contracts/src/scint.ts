/**
 * ScInt — high-level Stellar integer helper that produces SCVal values.
 */

import type {
  Int128Parts,
  UInt128Parts,
  Int256Parts,
  UInt256Parts,
} from '@stellar/xdr';

export type ScIntType = 'i64' | 'u64' | 'i128' | 'u128' | 'i256' | 'u256';

const U64_MASK = (1n << 64n) - 1n;

const RANGES: Record<ScIntType, { min: bigint; max: bigint }> = {
  i64: { min: -(1n << 63n), max: (1n << 63n) - 1n },
  u64: { min: 0n, max: (1n << 64n) - 1n },
  i128: { min: -(1n << 127n), max: (1n << 127n) - 1n },
  u128: { min: 0n, max: (1n << 128n) - 1n },
  i256: { min: -(1n << 255n), max: (1n << 255n) - 1n },
  u256: { min: 0n, max: (1n << 256n) - 1n },
};

function assertRange(type: ScIntType, value: bigint): void {
  const { min, max } = RANGES[type];
  if (value < min || value > max) {
    throw new RangeError(
      `Value ${value} out of range for ${type} [${min}, ${max}]`,
    );
  }
}

function splitI128(v: bigint): Int128Parts {
  return { hi: v >> 64n, lo: BigInt.asUintN(64, v) };
}

function splitU128(v: bigint): UInt128Parts {
  return { hi: (v >> 64n) & U64_MASK, lo: v & U64_MASK };
}

function splitI256(v: bigint): Int256Parts {
  return {
    hiHi: v >> 192n,
    hiLo: BigInt.asUintN(64, v >> 128n),
    loHi: BigInt.asUintN(64, v >> 64n),
    loLo: BigInt.asUintN(64, v),
  };
}

function splitU256(v: bigint): UInt256Parts {
  return {
    hiHi: (v >> 192n) & U64_MASK,
    hiLo: (v >> 128n) & U64_MASK,
    loHi: (v >> 64n) & U64_MASK,
    loLo: v & U64_MASK,
  };
}

export class ScInt {
  private readonly _value: bigint;
  private readonly _type: ScIntType | undefined;

  constructor(
    value: number | bigint | string,
    opts?: { type?: ScIntType },
  ) {
    this._value = BigInt(value);
    this._type = opts?.type;
    if (this._type) {
      assertRange(this._type, this._value);
    }
  }

  toBigInt(): bigint {
    return this._value;
  }

  toNumber(): number {
    if (
      this._value > BigInt(Number.MAX_SAFE_INTEGER) ||
      this._value < BigInt(Number.MIN_SAFE_INTEGER)
    ) {
      throw new RangeError(
        `Value ${this._value} is outside safe integer range`,
      );
    }
    return Number(this._value);
  }

  toI64(): any {
    assertRange('i64', this._value);
    return { I64: this._value };
  }

  toU64(): any {
    assertRange('u64', this._value);
    return { U64: this._value };
  }

  toI128(): any {
    assertRange('i128', this._value);
    return { I128: splitI128(this._value) };
  }

  toU128(): any {
    assertRange('u128', this._value);
    return { U128: splitU128(this._value) };
  }

  toI256(): any {
    assertRange('i256', this._value);
    return { I256: splitI256(this._value) };
  }

  toU256(): any {
    assertRange('u256', this._value);
    return { U256: splitU256(this._value) };
  }

  toScVal(): any {
    if (this._type) {
      // Range already validated in constructor; _value and _type are immutable.
      switch (this._type) {
        case 'i64': return { I64: this._value };
        case 'u64': return { U64: this._value };
        case 'i128': return { I128: splitI128(this._value) };
        case 'u128': return { U128: splitU128(this._value) };
        case 'i256': return { I256: splitI256(this._value) };
        case 'u256': return { U256: splitU256(this._value) };
      }
    }
    // Auto-detect smallest type
    const v = this._value;
    if (v >= 0n) {
      if (v <= RANGES.u64.max) return { U64: v };
      if (v <= RANGES.u128.max) return { U128: splitU128(v) };
      if (v <= RANGES.u256.max) return { U256: splitU256(v) };
      throw new RangeError(`Value ${v} exceeds u256 range`);
    } else {
      if (v >= RANGES.i64.min) return { I64: v };
      if (v >= RANGES.i128.min) return { I128: splitI128(v) };
      if (v >= RANGES.i256.min) return { I256: splitI256(v) };
      throw new RangeError(`Value ${v} exceeds i256 range`);
    }
  }
}
