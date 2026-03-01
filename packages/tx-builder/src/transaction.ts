import {
  type Transaction,
  type FeeBumpTransaction,
  type TransactionV1Envelope,
  type TransactionEnvelope,
  type FeeBumpTransactionEnvelope,
  type DecoratedSignature,
  TransactionEnvelope as TransactionEnvelopeCodec,
  encodeBase64,
  decodeBase64,
} from '@stellar/xdr';
import type { Keypair } from './keypair.js';
import { transactionHash, feeBumpTransactionHash } from './hash.js';
import { parseMuxedAccount } from './helpers.js';

export class BuiltTransaction {
  readonly tx: Transaction;
  readonly hash: Uint8Array;
  readonly networkPassphrase: string;
  private signatures: DecoratedSignature[] = [];

  constructor(tx: Transaction, hash: Uint8Array, networkPassphrase: string) {
    this.tx = tx;
    this.hash = hash;
    this.networkPassphrase = networkPassphrase;
  }

  async sign(...keypairs: Keypair[]): Promise<this> {
    const sigs = await Promise.all(keypairs.map((kp) => kp.signDecorated(this.hash)));
    this.signatures.push(...sigs);
    return this;
  }

  addSignature(sig: DecoratedSignature): this {
    this.signatures.push(sig);
    return this;
  }

  toEnvelope(): TransactionV1Envelope {
    return { tx: this.tx, signatures: this.signatures };
  }

  toTransactionEnvelope(): TransactionEnvelope {
    return { Tx: this.toEnvelope() };
  }

  toXdr(): Uint8Array {
    return TransactionEnvelopeCodec.toXdr(this.toTransactionEnvelope());
  }

  toBase64(): string {
    return encodeBase64(this.toXdr());
  }

  static async fromXdr(
    bytes: Uint8Array,
    passphrase: string,
  ): Promise<BuiltTransaction | BuiltFeeBumpTransaction> {
    const envelope = TransactionEnvelopeCodec.fromXdr(bytes);
    return deserializeEnvelope(envelope, passphrase);
  }

  static async fromBase64(
    str: string,
    passphrase: string,
  ): Promise<BuiltTransaction | BuiltFeeBumpTransaction> {
    return BuiltTransaction.fromXdr(decodeBase64(str), passphrase);
  }
}

export class BuiltFeeBumpTransaction {
  readonly tx: FeeBumpTransaction;
  readonly hash: Uint8Array;
  readonly networkPassphrase: string;
  readonly innerTransaction: BuiltTransaction;
  private signatures: DecoratedSignature[] = [];

  constructor(
    tx: FeeBumpTransaction,
    hash: Uint8Array,
    networkPassphrase: string,
    innerTransaction: BuiltTransaction,
  ) {
    this.tx = tx;
    this.hash = hash;
    this.networkPassphrase = networkPassphrase;
    this.innerTransaction = innerTransaction;
  }

  async sign(...keypairs: Keypair[]): Promise<this> {
    const sigs = await Promise.all(keypairs.map((kp) => kp.signDecorated(this.hash)));
    this.signatures.push(...sigs);
    return this;
  }

  addSignature(sig: DecoratedSignature): this {
    this.signatures.push(sig);
    return this;
  }

  toEnvelope(): FeeBumpTransactionEnvelope {
    return { tx: this.tx, signatures: this.signatures };
  }

  toTransactionEnvelope(): TransactionEnvelope {
    return { TxFeeBump: this.toEnvelope() };
  }

  toXdr(): Uint8Array {
    return TransactionEnvelopeCodec.toXdr(this.toTransactionEnvelope());
  }

  toBase64(): string {
    return encodeBase64(this.toXdr());
  }
}

export interface BuildFeeBumpTransactionOptions {
  feeSource: string;
  fee: bigint;
  innerTransaction: BuiltTransaction;
  networkPassphrase: string;
}

export async function buildFeeBumpTransaction(
  opts: BuildFeeBumpTransactionOptions,
): Promise<BuiltFeeBumpTransaction> {
  const innerEnvelope = opts.innerTransaction.toEnvelope();

  const tx: FeeBumpTransaction = {
    feeSource: parseMuxedAccount(opts.feeSource),
    fee: opts.fee,
    innerTx: { Tx: innerEnvelope },
    ext: '0',
  };

  const hash = await feeBumpTransactionHash(tx, opts.networkPassphrase);
  return new BuiltFeeBumpTransaction(tx, hash, opts.networkPassphrase, opts.innerTransaction);
}

async function deserializeEnvelope(
  envelope: TransactionEnvelope,
  passphrase: string,
): Promise<BuiltTransaction | BuiltFeeBumpTransaction> {
  if (typeof envelope === 'string') {
    throw new Error(`Unsupported envelope type: ${envelope}`);
  }
  if ('Tx' in envelope) {
    const v1 = envelope.Tx;
    const hash = await transactionHash(v1.tx, passphrase);
    const built = new BuiltTransaction(v1.tx, hash, passphrase);
    for (const sig of v1.signatures) {
      built.addSignature(sig);
    }
    return built;
  }
  if ('TxFeeBump' in envelope) {
    const bump = envelope.TxFeeBump;
    const innerEnv = bump.tx.innerTx;
    // innerTx is { Tx: TransactionV1Envelope }
    if (typeof innerEnv === 'string' || !('Tx' in innerEnv)) {
      throw new Error('Unsupported inner transaction type');
    }
    const innerV1 = innerEnv.Tx;
    const innerHash = await transactionHash(innerV1.tx, passphrase);
    const innerBuilt = new BuiltTransaction(innerV1.tx, innerHash, passphrase);
    for (const sig of innerV1.signatures) {
      innerBuilt.addSignature(sig);
    }
    const hash = await feeBumpTransactionHash(bump.tx, passphrase);
    const built = new BuiltFeeBumpTransaction(bump.tx, hash, passphrase, innerBuilt);
    for (const sig of bump.signatures) {
      built.addSignature(sig);
    }
    return built;
  }
  if ('TxV0' in envelope) {
    throw new Error('V0 transaction envelopes are not supported; upgrade to V1');
  }
  throw new Error('Unknown envelope type');
}
