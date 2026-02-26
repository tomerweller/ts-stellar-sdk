/**
 * JSON compatibility tests — verifies JSON output matches rs-stellar-xdr
 * serde behavior exactly.
 *
 * Ported from:
 *   - rs-stellar-xdr/tests/serde.rs
 *   - rs-stellar-xdr/tests/serde_ints.rs
 *   - rs-stellar-xdr/tests/serde_tx.rs
 */
import { describe, it, expect } from 'vitest';
import {
  uint32,
  int64,
  uint64,
  varOpaque,
  fixedOpaque,
  xdrString,
  xdrStruct,
  xdrEnum,
  taggedUnion,
  is,
  type XdrCodec,
} from '../../src/index.js';
import {
  TransactionEnvelope,
  TransactionV1Envelope,
  Transaction,
  MuxedAccount,
  Memo,
  Preconditions,
  Operation,
  OperationBody,
  ChangeTrustOp,
  ChangeTrustAsset,
  AlphaNum4,
  AssetCode4,
  AccountId,
  PublicKey,
  Hash,
  SequenceNumber,
  Int64,
  DecoratedSignature,
} from './stellar_types.js';
import {
  TX_SMALL_BYTES,
  TX_PAYMENT_BYTES,
  TX_WITH_SIG_BYTES,
  TX_CHANGE_TRUST_BYTES,
  ASSET_CREDIT4_BYTES,
  MEMO_NONE_BYTES,
  MEMO_TEXT_STELLAR_BYTES,
  MEMO_ID_BYTES,
  MEMO_HASH_BYTES,
} from './fixtures.js';

// ============================================================
// Helper keys for serde_tx test (decoded from plan's strkey addresses)
// ============================================================

const SOURCE_KEY = new Uint8Array([
  0x3c, 0xb3, 0x61, 0xab, 0x62, 0x4b, 0x10, 0x70,
  0x4c, 0x6c, 0xcf, 0x4f, 0xdb, 0x1e, 0x40, 0x79,
  0xd2, 0x3d, 0x68, 0xec, 0x2c, 0xd3, 0x22, 0xc2,
  0x28, 0x34, 0xc4, 0x1a, 0xe1, 0xe6, 0x4b, 0xd3,
]);

const OP_SOURCE_KEY = new Uint8Array([
  0x9b, 0x9f, 0xfa, 0xba, 0xcf, 0x46, 0x65, 0xb3,
  0x57, 0x29, 0x76, 0xfb, 0x85, 0x09, 0x79, 0xcb,
  0xc7, 0x6b, 0x9d, 0x67, 0x9c, 0x6b, 0xca, 0xeb,
  0xd5, 0x9b, 0xbf, 0xb3, 0x43, 0xe8, 0xe9, 0x46,
]);

const ISSUER_KEY = new Uint8Array([
  0x43, 0xd0, 0x9f, 0x49, 0x2a, 0x2a, 0xe3, 0xaa,
  0x0a, 0xed, 0x8e, 0xce, 0xdc, 0xb2, 0x26, 0xa4,
  0xf7, 0x50, 0xa9, 0x0e, 0xcb, 0x4e, 0x09, 0xf9,
  0xac, 0x76, 0x4a, 0x55, 0x37, 0xca, 0xd8, 0x77,
]);

// ============================================================
// From serde.rs — basic type JSON serialization
// ============================================================

describe('serde.rs — basic type JSON', () => {
  it('varOpaque → hex string', () => {
    const codec = varOpaque(100);
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    expect(codec.toJsonValue(data)).toBe('0102030405');
    expect(codec.fromJsonValue('0102030405')).toEqual(data);
  });

  it('xdrString → plain string', () => {
    const codec = xdrString(28);
    expect(codec.toJsonValue('Stellar')).toBe('Stellar');
    expect(codec.fromJsonValue('Stellar')).toBe('Stellar');
  });

  it('fixedOpaque(32) (Hash) → hex string', () => {
    const data = new Uint8Array(32);
    data[0] = 0xab;
    data[31] = 0xcd;
    const hex = Hash.toJsonValue(data) as string;
    expect(hex).toBe('ab000000000000000000000000000000000000000000000000000000000000cd');
    expect(Hash.fromJsonValue(hex)).toEqual(data);
  });

  it('AccountId → strkey string (G-address)', () => {
    const key = new Uint8Array(32);
    const json = AccountId.toJsonValue({ ed25519: key });
    expect(typeof json).toBe('string');
    expect((json as string).startsWith('G')).toBe(true);
    expect(json).toBe('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
  });

  it('AccountId JSON roundtrip', () => {
    const value = { ed25519: SOURCE_KEY };
    const json = AccountId.toJsonValue(value) as string;
    expect(json).toBe('GA6LGYNLMJFRA4CMNTHU7WY6IB45EPLI5QWNGIWCFA2MIGXB4ZF5GQGY');
    const roundtripped = AccountId.fromJsonValue(json);
    expect(roundtripped.ed25519).toEqual(SOURCE_KEY);
  });
});

// ============================================================
// From serde_ints.rs — 64-bit integer JSON serialization
// ============================================================

describe('serde_ints.rs — 64-bit integer JSON', () => {
  it('SequenceNumber(123) → "123"', () => {
    expect(SequenceNumber.toJsonValue(123n)).toBe('123');
    expect(SequenceNumber.fromJsonValue('123')).toBe(123n);
  });

  it('Int64(0) → "0"', () => {
    expect(Int64.toJsonValue(0n)).toBe('0');
  });

  it('Int64(-1) → "-1"', () => {
    expect(Int64.toJsonValue(-1n)).toBe('-1');
    expect(Int64.fromJsonValue('-1')).toBe(-1n);
  });

  it('uint64 max → "18446744073709551615"', () => {
    const max = 18446744073709551615n;
    expect(uint64.toJsonValue(max)).toBe('18446744073709551615');
    expect(uint64.fromJsonValue('18446744073709551615')).toBe(max);
  });

  it('int64 min → "-9223372036854775808"', () => {
    const min = -9223372036854775808n;
    expect(int64.toJsonValue(min)).toBe('-9223372036854775808');
    expect(int64.fromJsonValue('-9223372036854775808')).toBe(min);
  });

  it('union with i64 arm → {"i64":"-123"}', () => {
    const SwitchType = xdrEnum({ i64: 0, u64: 1 });
    const TestUnion = taggedUnion({
      switchOn: SwitchType,
      arms: [
        { tags: ['i64'], codec: int64 },
        { tags: ['u64'], codec: uint64 },
      ],
    });

    const i64Val = { i64: -123n };
    expect(TestUnion.toJsonValue(i64Val)).toEqual({ i64: '-123' });
    expect(TestUnion.fromJsonValue({ i64: '-123' })).toEqual({ i64: -123n });

    const u64Val = { u64: 123n };
    expect(TestUnion.toJsonValue(u64Val)).toEqual({ u64: '123' });
    expect(TestUnion.fromJsonValue({ u64: '123' })).toEqual({ u64: 123n });
  });

  it('struct with 64-bit field → {"nonce":"123"}', () => {
    interface TestStruct {
      readonly nonce: bigint;
    }
    const TestStruct = xdrStruct<TestStruct>([['nonce', int64]]);

    expect(TestStruct.toJsonValue({ nonce: 123n })).toEqual({ nonce: '123' });
    expect(TestStruct.fromJsonValue({ nonce: '123' })).toEqual({ nonce: 123n });
  });
});

// ============================================================
// From serde_tx.rs — TransactionEnvelope JSON (the crown jewel)
// ============================================================

describe('serde_tx.rs — TransactionEnvelope JSON', () => {
  // Construct the exact same TransactionEnvelope as rs-stellar-xdr test
  const envelope: { readonly tx: {
    readonly tx: {
      readonly source_account: { readonly ed25519: Uint8Array };
      readonly fee: number;
      readonly seq_num: bigint;
      readonly cond: 'none';
      readonly memo: { readonly text: string };
      readonly operations: readonly [{
        readonly source_account: { readonly ed25519: Uint8Array };
        readonly body: {
          readonly change_trust: {
            readonly line: {
              readonly credit_alphanum4: {
                readonly asset_code: Uint8Array;
                readonly issuer: { readonly ed25519: Uint8Array };
              };
            };
            readonly limit: bigint;
          };
        };
      }];
      readonly ext: 'v0';
    };
    readonly signatures: readonly [];
  }} = {
    tx: {
      tx: {
        source_account: { ed25519: SOURCE_KEY },
        fee: 0,
        seq_num: 1n,
        cond: 'none',
        memo: { text: 'Stellar' },
        operations: [{
          source_account: { ed25519: OP_SOURCE_KEY },
          body: {
            change_trust: {
              line: {
                credit_alphanum4: {
                  asset_code: new Uint8Array([65, 66, 67, 68]), // "ABCD"
                  issuer: { ed25519: ISSUER_KEY },
                },
              },
              limit: 9223372036854775807n,
            },
          },
        }],
        ext: 'v0',
      },
      signatures: [],
    },
  };

  // Expected JSON — must match rs-stellar-xdr output exactly
  const expectedJson = {
    tx: {
      tx: {
        source_account: 'GA6LGYNLMJFRA4CMNTHU7WY6IB45EPLI5QWNGIWCFA2MIGXB4ZF5GQGY',
        fee: 0,
        seq_num: '1',
        cond: 'none',
        memo: { text: 'Stellar' },
        operations: [{
          source_account: 'GCNZ76V2Z5DGLM2XFF3PXBIJPHF4O245M6OGXSXL2WN37M2D5DUUNSOO',
          body: {
            change_trust: {
              line: {
                credit_alphanum4: {
                  asset_code: 'ABCD',
                  issuer: 'GBB5BH2JFIVOHKQK5WHM5XFSE2SPOUFJB3FU4CPZVR3EUVJXZLMHOLOM',
                },
              },
              limit: '9223372036854775807',
            },
          },
        }],
        ext: 'v0',
      },
      signatures: [],
    },
  };

  it('toJsonValue produces exact match', () => {
    const json = TransactionEnvelope.toJsonValue(envelope);
    expect(json).toEqual(expectedJson);
  });

  it('toJson string matches', () => {
    const jsonStr = TransactionEnvelope.toJson(envelope);
    expect(JSON.parse(jsonStr)).toEqual(expectedJson);
  });

  it('fromJsonValue roundtrips back to same value', () => {
    const roundtripped = TransactionEnvelope.fromJsonValue(expectedJson);
    // Compare source_account
    expect(is(roundtripped, 'tx')).toBe(true);
    if (!is(roundtripped, 'tx')) return;
    const tx = roundtripped.tx.tx;
    expect(is(tx.source_account, 'ed25519')).toBe(true);
    if (is(tx.source_account, 'ed25519')) {
      expect(tx.source_account.ed25519).toEqual(SOURCE_KEY);
    }
    // Compare operation source_account
    const op = tx.operations[0]!;
    expect(op.source_account).not.toBeNull();
    if (op.source_account !== null && is(op.source_account, 'ed25519')) {
      expect(op.source_account.ed25519).toEqual(OP_SOURCE_KEY);
    }
    // Compare asset code
    expect(is(op.body, 'change_trust')).toBe(true);
    if (is(op.body, 'change_trust')) {
      expect(op.body.change_trust.limit).toBe(9223372036854775807n);
      if (is(op.body.change_trust.line, 'credit_alphanum4')) {
        expect(op.body.change_trust.line.credit_alphanum4.asset_code).toEqual(
          new Uint8Array([65, 66, 67, 68]),
        );
        expect(
          is(op.body.change_trust.line.credit_alphanum4.issuer, 'ed25519'),
        ).toBe(true);
        if (is(op.body.change_trust.line.credit_alphanum4.issuer, 'ed25519')) {
          expect(
            op.body.change_trust.line.credit_alphanum4.issuer.ed25519,
          ).toEqual(ISSUER_KEY);
        }
      }
    }
  });

  it('JSON → XDR → JSON roundtrip', () => {
    // Parse from JSON, encode to XDR, decode back, re-serialize to JSON
    const fromJson = TransactionEnvelope.fromJsonValue(expectedJson);
    const xdr = TransactionEnvelope.toXdr(fromJson);
    const fromXdr = TransactionEnvelope.fromXdr(xdr);
    const reJson = TransactionEnvelope.toJsonValue(fromXdr);
    expect(reJson).toEqual(expectedJson);
  });
});

// ============================================================
// XDR → JSON → XDR roundtrip for all binary fixtures
// ============================================================

describe('XDR → JSON → XDR roundtrip', () => {
  const fixtures = [
    { name: 'TX_SMALL', bytes: TX_SMALL_BYTES },
    { name: 'TX_PAYMENT', bytes: TX_PAYMENT_BYTES },
    { name: 'TX_WITH_SIG', bytes: TX_WITH_SIG_BYTES },
    { name: 'TX_CHANGE_TRUST', bytes: TX_CHANGE_TRUST_BYTES },
  ];

  for (const { name, bytes } of fixtures) {
    it(`${name}: XDR → JSON → XDR produces identical bytes`, () => {
      const decoded = TransactionEnvelope.fromXdr(bytes);
      const json = TransactionEnvelope.toJsonValue(decoded);
      const fromJson = TransactionEnvelope.fromJsonValue(json);
      const reencoded = TransactionEnvelope.toXdr(fromJson);
      expect(reencoded).toEqual(bytes);
    });

    it(`${name}: toJson/fromJson string roundtrip`, () => {
      const decoded = TransactionEnvelope.fromXdr(bytes);
      const jsonStr = TransactionEnvelope.toJson(decoded);
      const fromJson = TransactionEnvelope.fromJson(jsonStr);
      const reencoded = TransactionEnvelope.toXdr(fromJson);
      expect(reencoded).toEqual(bytes);
    });
  }
});

// ============================================================
// Asset JSON (domain-specific AssetCode)
// ============================================================

describe('Asset code JSON encoding', () => {
  it('AssetCode4 "USDC" → JSON string "USDC"', () => {
    const data = new Uint8Array([85, 83, 68, 67]);
    expect(AssetCode4.toJsonValue(data)).toBe('USDC');
  });

  it('AssetCode4 "AB\\0\\0" → JSON string "AB"', () => {
    const data = new Uint8Array([65, 66, 0, 0]);
    expect(AssetCode4.toJsonValue(data)).toBe('AB');
  });

  it('AssetCode4 JSON roundtrip', () => {
    const data = new Uint8Array([85, 83, 68, 67]);
    const json = AssetCode4.toJsonValue(data);
    const roundtripped = AssetCode4.fromJsonValue(json);
    expect(roundtripped).toEqual(data);
  });

  it('Asset::CreditAlphanum4 full JSON roundtrip via XDR', () => {
    const decoded = TransactionEnvelope.fromXdr(ASSET_CREDIT4_BYTES.buffer.byteLength
      ? TX_CHANGE_TRUST_BYTES
      : TX_CHANGE_TRUST_BYTES);
    const json = TransactionEnvelope.toJsonValue(decoded);
    const fromJson = TransactionEnvelope.fromJsonValue(json);
    expect(TransactionEnvelope.toXdr(fromJson)).toEqual(TX_CHANGE_TRUST_BYTES);
  });
});

// ============================================================
// Memo JSON
// ============================================================

describe('Memo JSON encoding', () => {
  it('Memo::none → "none"', () => {
    const decoded = Memo.fromXdr(MEMO_NONE_BYTES);
    expect(Memo.toJsonValue(decoded)).toBe('none');
  });

  it('Memo::text("Stellar") → {"text":"Stellar"}', () => {
    const decoded = Memo.fromXdr(MEMO_TEXT_STELLAR_BYTES);
    expect(Memo.toJsonValue(decoded)).toEqual({ text: 'Stellar' });
  });

  it('Memo::id(42) → {"id":"42"}', () => {
    const decoded = Memo.fromXdr(MEMO_ID_BYTES);
    expect(Memo.toJsonValue(decoded)).toEqual({ id: '42' });
  });

  it('Memo::hash → {"hash":"hex..."}', () => {
    const decoded = Memo.fromXdr(MEMO_HASH_BYTES);
    const json = Memo.toJsonValue(decoded) as Record<string, string>;
    expect(json).toHaveProperty('hash');
    expect(json.hash).toBe('0'.repeat(64));
  });

  it('Memo JSON roundtrips', () => {
    for (const bytes of [MEMO_NONE_BYTES, MEMO_TEXT_STELLAR_BYTES, MEMO_ID_BYTES, MEMO_HASH_BYTES]) {
      const decoded = Memo.fromXdr(bytes);
      const json = Memo.toJsonValue(decoded);
      const fromJson = Memo.fromJsonValue(json);
      expect(Memo.toXdr(fromJson)).toEqual(bytes);
    }
  });
});

// ============================================================
// PublicKey / MuxedAccount JSON
// ============================================================

describe('PublicKey / MuxedAccount JSON', () => {
  it('PublicKey → G-address', () => {
    const value = { ed25519: SOURCE_KEY };
    const json = PublicKey.toJsonValue(value) as string;
    expect(json).toBe('GA6LGYNLMJFRA4CMNTHU7WY6IB45EPLI5QWNGIWCFA2MIGXB4ZF5GQGY');
  });

  it('MuxedAccount ed25519 → G-address', () => {
    const value = { ed25519: SOURCE_KEY };
    const json = MuxedAccount.toJsonValue(value) as string;
    expect(json).toBe('GA6LGYNLMJFRA4CMNTHU7WY6IB45EPLI5QWNGIWCFA2MIGXB4ZF5GQGY');
  });

  it('MuxedAccount muxed_ed25519 → M-address', () => {
    const value = {
      muxed_ed25519: { id: 0n, ed25519: SOURCE_KEY },
    };
    const json = MuxedAccount.toJsonValue(value) as string;
    expect(json.startsWith('M')).toBe(true);
    // Roundtrip
    const roundtripped = MuxedAccount.fromJsonValue(json) as {
      muxed_ed25519: { id: bigint; ed25519: Uint8Array };
    };
    expect(roundtripped.muxed_ed25519.id).toBe(0n);
    expect(roundtripped.muxed_ed25519.ed25519).toEqual(SOURCE_KEY);
  });

  it('PublicKey JSON roundtrip preserves bytes', () => {
    const value = { ed25519: SOURCE_KEY };
    const json = PublicKey.toJsonValue(value);
    const roundtripped = PublicKey.fromJsonValue(json);
    expect(roundtripped.ed25519).toEqual(SOURCE_KEY);
    // And XDR roundtrip too
    const xdr = PublicKey.toXdr(value);
    const fromXdr = PublicKey.fromXdr(xdr);
    expect(PublicKey.toJsonValue(fromXdr)).toEqual(json);
  });
});
