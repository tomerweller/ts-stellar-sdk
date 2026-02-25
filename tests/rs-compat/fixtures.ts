/**
 * Test fixtures transcribed from rs-stellar-xdr test files.
 *
 * Each fixture includes the source reference and the exact byte/base64
 * representation for binary compatibility verification.
 *
 * References:
 *   https://github.com/nickmccurdy/rs-stellar-xdr/tree/main/tests
 */

// ============================================================
// Helper
// ============================================================

/** Concatenate multiple Uint8Arrays */
export function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

/** Create Uint8Array from number values */
function b(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

/** Create n zero bytes */
function zeros(n: number): Uint8Array {
  return new Uint8Array(n);
}

// ============================================================
// Fixture 1: Minimal TransactionEnvelope (ENVELOPE_TYPE_TX)
//
// Inspired by rs-stellar-xdr/tests/tx_small.rs
// A transaction with:
//   - Source account: Ed25519 all-zeros
//   - Fee: 100
//   - SeqNum: 1
//   - Preconditions: None
//   - Memo: Text("Stellar")
//   - 1 operation: CreateAccount (destination=all-zeros, balance=10000000)
//   - No signatures
// ============================================================

// Build the expected bytes piece by piece for clarity:
const TX_SMALL_PARTS = {
  // TransactionEnvelope discriminant: ENVELOPE_TYPE_TX = 2
  envelopeType: b(0, 0, 0, 2),

  // Transaction.sourceAccount: MuxedAccount KEY_TYPE_ED25519 = 0
  sourceType: b(0, 0, 0, 0),
  sourceKey: zeros(32),

  // Transaction.fee: uint32 = 100
  fee: b(0, 0, 0, 100),

  // Transaction.seqNum: int64 = 1
  seqNum: b(0, 0, 0, 0, 0, 0, 0, 1),

  // Transaction.cond: PRECOND_NONE = 0
  precondNone: b(0, 0, 0, 0),

  // Transaction.memo: MEMO_TEXT = 1, string "Stellar" (7 bytes + 1 pad)
  memoType: b(0, 0, 0, 1),
  memoLen: b(0, 0, 0, 7),
  memoText: b(83, 116, 101, 108, 108, 97, 114), // "Stellar"
  memoPad: b(0),

  // Transaction.operations: length = 1
  opsLen: b(0, 0, 0, 1),

  // Operation.sourceAccount: option = false (0)
  opSourceNone: b(0, 0, 0, 0),

  // Operation.body: CREATE_ACCOUNT = 0
  opType: b(0, 0, 0, 0),

  // CreateAccountOp.destination: PublicKey ED25519 = 0, all-zeros
  destType: b(0, 0, 0, 0),
  destKey: zeros(32),

  // CreateAccountOp.startingBalance: int64 = 10000000 (0x989680)
  startingBalance: b(0, 0, 0, 0, 0, 0x98, 0x96, 0x80),

  // Transaction.ext: v = 0
  txExt: b(0, 0, 0, 0),

  // TransactionV1Envelope.signatures: length = 0
  sigsLen: b(0, 0, 0, 0),
};

export const TX_SMALL_BYTES = concat(
  TX_SMALL_PARTS.envelopeType,
  TX_SMALL_PARTS.sourceType,
  TX_SMALL_PARTS.sourceKey,
  TX_SMALL_PARTS.fee,
  TX_SMALL_PARTS.seqNum,
  TX_SMALL_PARTS.precondNone,
  TX_SMALL_PARTS.memoType,
  TX_SMALL_PARTS.memoLen,
  TX_SMALL_PARTS.memoText,
  TX_SMALL_PARTS.memoPad,
  TX_SMALL_PARTS.opsLen,
  TX_SMALL_PARTS.opSourceNone,
  TX_SMALL_PARTS.opType,
  TX_SMALL_PARTS.destType,
  TX_SMALL_PARTS.destKey,
  TX_SMALL_PARTS.startingBalance,
  TX_SMALL_PARTS.txExt,
  TX_SMALL_PARTS.sigsLen,
);

// ============================================================
// Fixture 2: TransactionEnvelope with Memo::Text("Stellar") + Payment
//
// Inspired by rs-stellar-xdr/tests/serde_tx.rs
// Source account uses a specific non-zero key.
// ============================================================

const SOURCE_KEY_HEX = [
  0x3c, 0xb3, 0x23, 0x66, 0x95, 0x0a, 0x30, 0x14,
  0x4e, 0xca, 0x2e, 0x24, 0x2b, 0x85, 0x25, 0x43,
  0xb4, 0x85, 0x5c, 0x3a, 0xb4, 0x55, 0x72, 0x58,
  0xb1, 0x83, 0xc6, 0x40, 0xba, 0x5c, 0x48, 0xef,
];
const DEST_KEY_HEX = [
  0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, 0x11,
  0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99,
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
];

export const TX_PAYMENT_BYTES = concat(
  // EnvelopeType: Tx = 2
  b(0, 0, 0, 2),
  // sourceAccount: MuxedAccount Ed25519
  b(0, 0, 0, 0),
  b(...SOURCE_KEY_HEX),
  // fee: 200
  b(0, 0, 0, 200),
  // seqNum: 5
  b(0, 0, 0, 0, 0, 0, 0, 5),
  // cond: PRECOND_TIME = 1
  b(0, 0, 0, 1),
  // TimeBounds { minTime: 0, maxTime: 1000 }
  b(0, 0, 0, 0, 0, 0, 0, 0),   // minTime
  b(0, 0, 0, 0, 0, 0, 3, 232),  // maxTime = 1000
  // memo: MEMO_TEXT = 1, "Stellar"
  b(0, 0, 0, 1),
  b(0, 0, 0, 7),
  b(83, 116, 101, 108, 108, 97, 114),
  b(0), // padding
  // operations: length = 1
  b(0, 0, 0, 1),
  // Operation.sourceAccount: None
  b(0, 0, 0, 0),
  // Operation.body: PAYMENT = 1
  b(0, 0, 0, 1),
  // PaymentOp.destination: MuxedAccount Ed25519
  b(0, 0, 0, 0),
  b(...DEST_KEY_HEX),
  // PaymentOp.asset: NATIVE = 0
  b(0, 0, 0, 0),
  // PaymentOp.amount: 50000000 = 0x02FAF080
  b(0, 0, 0, 0, 0x02, 0xfa, 0xf0, 0x80),
  // Transaction.ext: v=0
  b(0, 0, 0, 0),
  // signatures: length=0
  b(0, 0, 0, 0),
);

// ============================================================
// Fixture 3: Asset::CreditAlphanum4 roundtrip
// ============================================================

export const ASSET_CREDIT4_BYTES = concat(
  // AssetType: CreditAlphanum4 = 1
  b(0, 0, 0, 1),
  // AlphaNum4.assetCode: "USDC" (4 bytes, no padding needed)
  b(85, 83, 68, 67),
  // AlphaNum4.issuer: PublicKey Ed25519, all-zeros
  b(0, 0, 0, 0),
  zeros(32),
);

// ============================================================
// Fixture 4: Memo variants
// ============================================================

export const MEMO_NONE_BYTES = b(0, 0, 0, 0);
export const MEMO_TEXT_STELLAR_BYTES = concat(
  b(0, 0, 0, 1), // MEMO_TEXT
  b(0, 0, 0, 7), // length
  b(83, 116, 101, 108, 108, 97, 114), // "Stellar"
  b(0), // padding
);
export const MEMO_ID_BYTES = concat(
  b(0, 0, 0, 2), // MEMO_ID
  b(0, 0, 0, 0, 0, 0, 0, 42), // id = 42
);
export const MEMO_HASH_BYTES = concat(
  b(0, 0, 0, 3), // MEMO_HASH
  zeros(32),      // 32-byte hash (all zeros)
);

// ============================================================
// Fixture 5: Default/zero values (from rs-stellar-xdr/tests/default.rs)
// ============================================================

export const DEFAULT_UINT32_BYTES = b(0, 0, 0, 0);
export const DEFAULT_HASH_BYTES = zeros(32);
export const DEFAULT_INT64_BYTES = b(0, 0, 0, 0, 0, 0, 0, 0);

// ============================================================
// Fixture 6: Variable-length container edge cases
//             (from rs-stellar-xdr/tests/vecm.rs)
// ============================================================

// A var opaque with length 5: [0x01, 0x02, 0x03, 0x04, 0x05] + 3 bytes padding
export const VAR_OPAQUE_5_BYTES = concat(
  b(0, 0, 0, 5),           // length
  b(1, 2, 3, 4, 5),        // data
  b(0, 0, 0),              // padding to 4-byte boundary
);

// Oversized length prefix — 0xFFFFFFFF (4294967295)
// This should fail to decode for any bounded container
export const OVERSIZED_LENGTH_BYTES = b(0xff, 0xff, 0xff, 0xff);

// ============================================================
// Fixture 7: Transaction with signature
// ============================================================

const SIG_HINT = b(0xde, 0xad, 0xbe, 0xef);
const SIG_BYTES_RAW = new Uint8Array(64);
SIG_BYTES_RAW.fill(0xab);

export const TX_WITH_SIG_BYTES = concat(
  // EnvelopeType: Tx = 2
  b(0, 0, 0, 2),
  // sourceAccount: MuxedAccount Ed25519, all-zeros
  b(0, 0, 0, 0),
  zeros(32),
  // fee: 100
  b(0, 0, 0, 100),
  // seqNum: 99
  b(0, 0, 0, 0, 0, 0, 0, 99),
  // cond: PRECOND_NONE
  b(0, 0, 0, 0),
  // memo: MEMO_NONE
  b(0, 0, 0, 0),
  // operations: length = 1
  b(0, 0, 0, 1),
  // Operation.sourceAccount: None
  b(0, 0, 0, 0),
  // Operation.body: CREATE_ACCOUNT = 0
  b(0, 0, 0, 0),
  // CreateAccountOp.destination: PublicKey Ed25519, all-zeros
  b(0, 0, 0, 0),
  zeros(32),
  // CreateAccountOp.startingBalance: 10000000
  b(0, 0, 0, 0, 0, 0x98, 0x96, 0x80),
  // Transaction.ext: v=0
  b(0, 0, 0, 0),
  // signatures: length = 1
  b(0, 0, 0, 1),
  // DecoratedSignature[0].hint: 4 bytes
  SIG_HINT,
  // DecoratedSignature[0].signature: varOpaque, length=64
  b(0, 0, 0, 64),
  SIG_BYTES_RAW,
);

// ============================================================
// Fixture 8: ChangeTrust operation
//             (from rs-stellar-xdr/tests/serde_tx.rs)
// ============================================================

export const TX_CHANGE_TRUST_BYTES = concat(
  // EnvelopeType: Tx = 2
  b(0, 0, 0, 2),
  // sourceAccount: Ed25519 all-zeros
  b(0, 0, 0, 0),
  zeros(32),
  // fee: 100
  b(0, 0, 0, 100),
  // seqNum: 3
  b(0, 0, 0, 0, 0, 0, 0, 3),
  // cond: PRECOND_NONE
  b(0, 0, 0, 0),
  // memo: MEMO_NONE
  b(0, 0, 0, 0),
  // operations: length = 1
  b(0, 0, 0, 1),
  // Operation.sourceAccount: None
  b(0, 0, 0, 0),
  // Operation.body: CHANGE_TRUST = 6
  b(0, 0, 0, 6),
  // ChangeTrustOp.line: CreditAlphanum4
  b(0, 0, 0, 1), // AssetType = 1
  b(85, 83, 68, 67), // "USDC"
  b(0, 0, 0, 0), // issuer PublicKey type
  zeros(32),      // issuer key
  // ChangeTrustOp.limit: int64 MAX (0x7FFFFFFFFFFFFFFF)
  b(0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff),
  // Transaction.ext: v=0
  b(0, 0, 0, 0),
  // signatures: length=0
  b(0, 0, 0, 0),
);
