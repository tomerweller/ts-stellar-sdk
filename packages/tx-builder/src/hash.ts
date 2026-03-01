import {
  type Transaction,
  Transaction as TransactionCodec,
  type FeeBumpTransaction,
  FeeBumpTransaction as FeeBumpTransactionCodec,
  XdrWriter,
} from '@stellar/xdr';

const encoder = new TextEncoder();

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', data as ArrayBufferView<ArrayBuffer>);
  return new Uint8Array(digest);
}

const networkIdCache = new Map<string, Uint8Array>();

export async function networkId(passphrase: string): Promise<Uint8Array> {
  let cached = networkIdCache.get(passphrase);
  if (cached) return cached;
  cached = await sha256(encoder.encode(passphrase));
  networkIdCache.set(passphrase, cached);
  return cached;
}

// EnvelopeType.Tx = 2, as 4-byte big-endian
const ENVELOPE_TYPE_TX = new Uint8Array([0, 0, 0, 2]);
// EnvelopeType.TxFeeBump = 5, as 4-byte big-endian
const ENVELOPE_TYPE_TX_FEE_BUMP = new Uint8Array([0, 0, 0, 5]);

export async function transactionHash(
  tx: Transaction,
  passphrase: string,
): Promise<Uint8Array> {
  const nid = await networkId(passphrase);
  const txBytes = TransactionCodec.toXdr(tx);
  const tagged = new Uint8Array(nid.length + ENVELOPE_TYPE_TX.length + txBytes.length);
  tagged.set(nid, 0);
  tagged.set(ENVELOPE_TYPE_TX, nid.length);
  tagged.set(txBytes, nid.length + ENVELOPE_TYPE_TX.length);
  return sha256(tagged);
}

export async function feeBumpTransactionHash(
  tx: FeeBumpTransaction,
  passphrase: string,
): Promise<Uint8Array> {
  const nid = await networkId(passphrase);
  const txBytes = FeeBumpTransactionCodec.toXdr(tx);
  const tagged = new Uint8Array(nid.length + ENVELOPE_TYPE_TX_FEE_BUMP.length + txBytes.length);
  tagged.set(nid, 0);
  tagged.set(ENVELOPE_TYPE_TX_FEE_BUMP, nid.length);
  tagged.set(txBytes, nid.length + ENVELOPE_TYPE_TX_FEE_BUMP.length);
  return sha256(tagged);
}
