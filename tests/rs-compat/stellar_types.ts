/**
 * Hand-written Stellar XDR types — minimal subset needed for rs-stellar-xdr
 * compatibility tests. These mirror what the xdrgen TypeScript backend would
 * generate from the Stellar .x schema files.
 *
 * Source: https://github.com/nickmccurdy/xdr/tree/master/Stellar
 */
import {
  int32,
  uint32,
  int64,
  uint64,
  bool,
  fixedOpaque,
  varOpaque,
  xdrString,
  fixedArray,
  varArray,
  option,
  xdrStruct,
  xdrEnum,
  taggedUnion,
  type XdrCodec,
} from '../../src/index.js';

// ============================================================
// Primitive typedefs
// ============================================================

export type Uint256 = Uint8Array;
export const Uint256: XdrCodec<Uint256> = fixedOpaque(32);

export type Hash = Uint8Array;
export const Hash: XdrCodec<Hash> = fixedOpaque(32);

export type SignatureHint = Uint8Array;
export const SignatureHint: XdrCodec<SignatureHint> = fixedOpaque(4);

export type Signature = Uint8Array;
export const Signature: XdrCodec<Signature> = varOpaque(64);

export type AssetCode4 = Uint8Array;
export const AssetCode4: XdrCodec<AssetCode4> = fixedOpaque(4);

export type AssetCode12 = Uint8Array;
export const AssetCode12: XdrCodec<AssetCode12> = fixedOpaque(12);

export type SequenceNumber = bigint;
export const SequenceNumber: XdrCodec<SequenceNumber> = int64;

export type TimePoint = bigint;
export const TimePoint: XdrCodec<TimePoint> = uint64;

export type Int64 = bigint;
export const Int64: XdrCodec<Int64> = int64;

// ============================================================
// PublicKey
// ============================================================

export type PublicKeyType = 'Ed25519';
export const PublicKeyType = xdrEnum({
  Ed25519: 0,
});

export type PublicKey = { readonly tag: 'Ed25519'; readonly value: Uint8Array };
export const PublicKey: XdrCodec<PublicKey> = taggedUnion({
  switchOn: PublicKeyType,
  arms: [{ tags: ['Ed25519'], codec: Uint256 }],
}) as XdrCodec<PublicKey>;

export type AccountId = PublicKey;
export const AccountId: XdrCodec<AccountId> = PublicKey;

// ============================================================
// CryptoKeyType / MuxedAccount
// ============================================================

export type CryptoKeyType =
  | 'Ed25519'
  | 'PreAuthTx'
  | 'HashX'
  | 'Ed25519SignedPayload'
  | 'MuxedEd25519';
export const CryptoKeyType = xdrEnum({
  Ed25519: 0,
  PreAuthTx: 1,
  HashX: 2,
  Ed25519SignedPayload: 3,
  MuxedEd25519: 0x100,
});

export interface MuxedAccountMed25519 {
  readonly id: bigint;
  readonly ed25519: Uint8Array;
}
export const MuxedAccountMed25519: XdrCodec<MuxedAccountMed25519> =
  xdrStruct<MuxedAccountMed25519>([
    ['id', uint64],
    ['ed25519', Uint256],
  ]);

export type MuxedAccount =
  | { readonly tag: 'Ed25519'; readonly value: Uint8Array }
  | { readonly tag: 'MuxedEd25519'; readonly value: MuxedAccountMed25519 };
export const MuxedAccount: XdrCodec<MuxedAccount> = taggedUnion({
  switchOn: CryptoKeyType,
  arms: [
    { tags: ['Ed25519'], codec: Uint256 },
    { tags: ['MuxedEd25519'], codec: MuxedAccountMed25519 },
  ],
}) as XdrCodec<MuxedAccount>;

// ============================================================
// TimeBounds / Preconditions
// ============================================================

export interface TimeBounds {
  readonly minTime: bigint;
  readonly maxTime: bigint;
}
export const TimeBounds: XdrCodec<TimeBounds> = xdrStruct<TimeBounds>([
  ['minTime', TimePoint],
  ['maxTime', TimePoint],
]);

export type PreconditionType = 'None' | 'Time' | 'V2';
export const PreconditionType = xdrEnum({
  None: 0,
  Time: 1,
  V2: 2,
});

// Simplified: only None and Time arms (V2 omitted for test subset)
export type Preconditions =
  | { readonly tag: 'None' }
  | { readonly tag: 'Time'; readonly value: TimeBounds };
export const Preconditions: XdrCodec<Preconditions> = taggedUnion({
  switchOn: PreconditionType,
  arms: [
    { tags: ['None'] },
    { tags: ['Time'], codec: TimeBounds },
  ],
}) as XdrCodec<Preconditions>;

// ============================================================
// Memo
// ============================================================

export type MemoType = 'None' | 'Text' | 'Id' | 'Hash' | 'Return';
export const MemoType = xdrEnum({
  None: 0,
  Text: 1,
  Id: 2,
  Hash: 3,
  Return: 4,
});

export type Memo =
  | { readonly tag: 'None' }
  | { readonly tag: 'Text'; readonly value: string }
  | { readonly tag: 'Id'; readonly value: bigint }
  | { readonly tag: 'Hash'; readonly value: Uint8Array }
  | { readonly tag: 'Return'; readonly value: Uint8Array };
export const Memo: XdrCodec<Memo> = taggedUnion({
  switchOn: MemoType,
  arms: [
    { tags: ['None'] },
    { tags: ['Text'], codec: xdrString(28) },
    { tags: ['Id'], codec: uint64 },
    { tags: ['Hash'], codec: Hash },
    { tags: ['Return'], codec: Hash },
  ],
}) as XdrCodec<Memo>;

// ============================================================
// Asset types
// ============================================================

export type AssetType =
  | 'Native'
  | 'CreditAlphanum4'
  | 'CreditAlphanum12'
  | 'PoolShare';
export const AssetType = xdrEnum({
  Native: 0,
  CreditAlphanum4: 1,
  CreditAlphanum12: 2,
  PoolShare: 3,
});

export interface AlphaNum4 {
  readonly assetCode: Uint8Array;
  readonly issuer: AccountId;
}
export const AlphaNum4: XdrCodec<AlphaNum4> = xdrStruct<AlphaNum4>([
  ['assetCode', AssetCode4],
  ['issuer', AccountId],
]);

export interface AlphaNum12 {
  readonly assetCode: Uint8Array;
  readonly issuer: AccountId;
}
export const AlphaNum12: XdrCodec<AlphaNum12> = xdrStruct<AlphaNum12>([
  ['assetCode', AssetCode12],
  ['issuer', AccountId],
]);

export type Asset =
  | { readonly tag: 'Native' }
  | { readonly tag: 'CreditAlphanum4'; readonly value: AlphaNum4 }
  | { readonly tag: 'CreditAlphanum12'; readonly value: AlphaNum12 };
export const Asset: XdrCodec<Asset> = taggedUnion({
  switchOn: AssetType,
  arms: [
    { tags: ['Native'] },
    { tags: ['CreditAlphanum4'], codec: AlphaNum4 },
    { tags: ['CreditAlphanum12'], codec: AlphaNum12 },
  ],
}) as XdrCodec<Asset>;

// ============================================================
// Operations
// ============================================================

export type OperationType =
  | 'CreateAccount'
  | 'Payment'
  | 'ChangeTrust';
export const OperationType = xdrEnum({
  CreateAccount: 0,
  Payment: 1,
  ChangeTrust: 6,
});

export interface CreateAccountOp {
  readonly destination: AccountId;
  readonly startingBalance: bigint;
}
export const CreateAccountOp: XdrCodec<CreateAccountOp> =
  xdrStruct<CreateAccountOp>([
    ['destination', AccountId],
    ['startingBalance', Int64],
  ]);

export interface PaymentOp {
  readonly destination: MuxedAccount;
  readonly asset: Asset;
  readonly amount: bigint;
}
export const PaymentOp: XdrCodec<PaymentOp> = xdrStruct<PaymentOp>([
  ['destination', MuxedAccount],
  ['asset', Asset],
  ['amount', Int64],
]);

// ChangeTrustAsset — simplified (only native & credit types)
export type ChangeTrustAsset =
  | { readonly tag: 'Native' }
  | { readonly tag: 'CreditAlphanum4'; readonly value: AlphaNum4 }
  | { readonly tag: 'CreditAlphanum12'; readonly value: AlphaNum12 };
export const ChangeTrustAsset: XdrCodec<ChangeTrustAsset> = taggedUnion({
  switchOn: AssetType,
  arms: [
    { tags: ['Native'] },
    { tags: ['CreditAlphanum4'], codec: AlphaNum4 },
    { tags: ['CreditAlphanum12'], codec: AlphaNum12 },
    { tags: ['PoolShare'] }, // void arm for completeness
  ],
}) as XdrCodec<ChangeTrustAsset>;

export interface ChangeTrustOp {
  readonly line: ChangeTrustAsset;
  readonly limit: bigint;
}
export const ChangeTrustOp: XdrCodec<ChangeTrustOp> =
  xdrStruct<ChangeTrustOp>([
    ['line', ChangeTrustAsset],
    ['limit', Int64],
  ]);

export type OperationBody =
  | { readonly tag: 'CreateAccount'; readonly value: CreateAccountOp }
  | { readonly tag: 'Payment'; readonly value: PaymentOp }
  | { readonly tag: 'ChangeTrust'; readonly value: ChangeTrustOp };
export const OperationBody: XdrCodec<OperationBody> = taggedUnion({
  switchOn: OperationType,
  arms: [
    { tags: ['CreateAccount'], codec: CreateAccountOp },
    { tags: ['Payment'], codec: PaymentOp },
    { tags: ['ChangeTrust'], codec: ChangeTrustOp },
  ],
}) as XdrCodec<OperationBody>;

export interface Operation {
  readonly sourceAccount: MuxedAccount | undefined;
  readonly body: OperationBody;
}
export const Operation: XdrCodec<Operation> = xdrStruct<Operation>([
  ['sourceAccount', option(MuxedAccount)],
  ['body', OperationBody],
]);

// ============================================================
// Transaction
// ============================================================

export type TransactionExt = { readonly tag: 0 };
export const TransactionExt: XdrCodec<TransactionExt> = taggedUnion({
  switchOn: int32,
  arms: [{ tags: [0] }],
}) as XdrCodec<TransactionExt>;

export interface Transaction {
  readonly sourceAccount: MuxedAccount;
  readonly fee: number;
  readonly seqNum: bigint;
  readonly cond: Preconditions;
  readonly memo: Memo;
  readonly operations: readonly Operation[];
  readonly ext: TransactionExt;
}
export const Transaction: XdrCodec<Transaction> = xdrStruct<Transaction>([
  ['sourceAccount', MuxedAccount],
  ['fee', uint32],
  ['seqNum', SequenceNumber],
  ['cond', Preconditions],
  ['memo', Memo],
  ['operations', varArray(100, Operation)],
  ['ext', TransactionExt],
]);

// ============================================================
// DecoratedSignature / Envelope
// ============================================================

export interface DecoratedSignature {
  readonly hint: Uint8Array;
  readonly signature: Uint8Array;
}
export const DecoratedSignature: XdrCodec<DecoratedSignature> =
  xdrStruct<DecoratedSignature>([
    ['hint', SignatureHint],
    ['signature', Signature],
  ]);

export interface TransactionV1Envelope {
  readonly tx: Transaction;
  readonly signatures: readonly DecoratedSignature[];
}
export const TransactionV1Envelope: XdrCodec<TransactionV1Envelope> =
  xdrStruct<TransactionV1Envelope>([
    ['tx', Transaction],
    ['signatures', varArray(20, DecoratedSignature)],
  ]);

export type EnvelopeType =
  | 'TxV0'
  | 'Scp'
  | 'Tx'
  | 'Auth'
  | 'ScpValue'
  | 'TxFeeBump'
  | 'OpId'
  | 'PoolRevokeOpId'
  | 'ContractId'
  | 'SorobanAuthorization';
export const EnvelopeType = xdrEnum({
  TxV0: 0,
  Scp: 1,
  Tx: 2,
  Auth: 3,
  ScpValue: 4,
  TxFeeBump: 5,
  OpId: 6,
  PoolRevokeOpId: 7,
  ContractId: 8,
  SorobanAuthorization: 9,
});

// Simplified: only Tx arm (V0 and FeeBump omitted for test subset)
export type TransactionEnvelope = {
  readonly tag: 'Tx';
  readonly value: TransactionV1Envelope;
};
export const TransactionEnvelope: XdrCodec<TransactionEnvelope> = taggedUnion({
  switchOn: EnvelopeType,
  arms: [{ tags: ['Tx'], codec: TransactionV1Envelope }],
}) as XdrCodec<TransactionEnvelope>;

// ============================================================
// Uint32 / Int64 as named types (for default value tests)
// ============================================================

export type Uint32 = number;
export const Uint32: XdrCodec<Uint32> = uint32;
