# @stellar/tx-builder

Transaction building, signing, and keypair management for the Stellar network. Replaces `@stellar/stellar-base` with a modern TypeScript API. Depends on `@stellar/xdr`.

## Installation

```bash
npm install @stellar/tx-builder
```

## Quick Start

```typescript
import {
  Keypair, TransactionBuilder, Networks,
  createAccount, payment, nativeAsset, memoText,
} from '@stellar/tx-builder';

// Create a keypair
const keypair = await Keypair.random();
console.log(keypair.publicKey); // G...
console.log(keypair.secret);   // S...

// Build a transaction
const source = { address: keypair.publicKey, sequenceNumber: 100n };

const tx = await new TransactionBuilder(source, {
  fee: 100,
  networkPassphrase: Networks.TESTNET,
  memo: memoText('hello'),
})
  .addOperation(payment({
    destination: 'GAT4KBPBCPTOLGILH5NNTBWSXHEBUTRQMEUSQGSPCCFM4QHO2COADB5O',
    asset: nativeAsset(),
    amount: 10_0000000n, // 10 XLM in stroops
  }))
  .setTimeout(30)
  .build();

// Sign and serialize
await tx.sign(keypair);
const envelope = tx.toBase64(); // ready to submit
```

## API

### `Keypair`

Ed25519 keypair for Stellar accounts.

```typescript
// Create
const kp = await Keypair.random();
const kp = await Keypair.fromSecret('S...');
const kp = Keypair.fromPublicKey('G...');

// Properties
kp.publicKey;      // G-address string
kp.secret;         // S-address string (throws if public-only)
kp.rawPublicKey;   // Uint8Array(32)
kp.rawSecretKey;   // Uint8Array(32) (throws if public-only)
kp.canSign();      // true if secret key is available

// Sign & verify
const sig = await kp.sign(data);              // Uint8Array(64)
const dec = await kp.signDecorated(data);     // { hint, signature }
const ok = await kp.verify(data, signature);  // boolean
kp.signatureHint();                           // last 4 bytes of public key

// Convert to XDR types
kp.toAccountId();     // AccountID
kp.toMuxedAccount();  // MuxedAccount
```

### `TransactionBuilder`

Chainable builder for Stellar transactions.

```typescript
const builder = new TransactionBuilder(sourceAccount, {
  fee: 100,                          // base fee per operation (stroops)
  networkPassphrase: Networks.PUBLIC,
  memo: memoNone(),                  // optional
  timeBounds: { min_time: 0n, max_time: 0n }, // optional
});

builder.addOperation(op);                     // returns this
builder.setMemo(memoText('hi'));              // returns this
builder.setTimeout(30);                       // maxTime = now + seconds
builder.setTimeBounds(0n, 1700000000n);       // explicit bounds
builder.setLedgerBounds(1000, 2000);
builder.setPreconditions({ /* PreconditionsV2 fields */ });

const tx: BuiltTransaction = await builder.build();
```

`sourceAccount` must implement `{ address: string; sequenceNumber: bigint }`.

### `BuiltTransaction`

Signed/unsigned transaction ready for serialization.

```typescript
await tx.sign(keypair1, keypair2);   // sign with one or more keypairs
tx.addSignature(decoratedSig);       // add pre-computed signature

tx.toEnvelope();             // TransactionV1Envelope
tx.toTransactionEnvelope();  // TransactionEnvelope (tagged union)
tx.toXdr();                  // Uint8Array
tx.toBase64();               // string

tx.tx;                  // Transaction (XDR type)
tx.hash;                // Uint8Array(32)
tx.networkPassphrase;   // string
```

### `BuiltFeeBumpTransaction`

```typescript
import { buildFeeBumpTransaction } from '@stellar/tx-builder';

const feeBump = await buildFeeBumpTransaction({
  feeSource: 'G...',
  fee: 200n,
  innerTransaction: tx,
  networkPassphrase: Networks.PUBLIC,
});

await feeBump.sign(feeSourceKeypair);
feeBump.toBase64();
feeBump.innerTransaction; // BuiltTransaction
```

### Deserialization

```typescript
const tx = await BuiltTransaction.fromBase64(envelope, Networks.TESTNET);
const tx = await BuiltTransaction.fromXdr(bytes, Networks.TESTNET);
// Returns BuiltTransaction or BuiltFeeBumpTransaction
```

### Operation Factories

All operations accept an optional `source?: string` for per-operation source account override.

**Payments:**
- `createAccount({ destination, startingBalance })`
- `payment({ destination, asset, amount })`
- `pathPaymentStrictReceive({ sendAsset, sendMax, destination, destAsset, destAmount, path })`
- `pathPaymentStrictSend({ sendAsset, sendAmount, destination, destAsset, destMin, path })`

**Trading:**
- `manageSellOffer({ selling, buying, amount, price, offerID? })`
- `manageBuyOffer({ selling, buying, buyAmount, price, offerID? })`
- `createPassiveSellOffer({ selling, buying, amount, price })`

**Account management:**
- `setOptions({ inflationDest?, clearFlags?, setFlags?, masterWeight?, lowThreshold?, medThreshold?, highThreshold?, homeDomain?, signer? })`
- `changeTrust({ asset, limit? })`
- `allowTrust({ trustor, assetCode, authorize })`
- `accountMerge({ destination })`
- `inflation()`
- `manageData({ name, value })`
- `bumpSequence({ bumpTo })`

**Claimable balances:**
- `createClaimableBalance({ asset, amount, claimants })`
- `claimClaimableBalance({ balanceID })`

**Sponsorship:**
- `beginSponsoringFutureReserves({ sponsoredID })`
- `endSponsoringFutureReserves()`
- `revokeSponsorshipLedgerEntry({ ledgerKey })`
- `revokeSponsorshipSigner({ signer })`

**Clawback:**
- `clawback({ asset, from, amount })`
- `clawbackClaimableBalance({ balanceID })`

**Trust lines:**
- `setTrustLineFlags({ trustor, asset, clearFlags, setFlags })`

**Liquidity pools:**
- `liquidityPoolDeposit({ liquidityPoolID, maxAmountA, maxAmountB, minPrice, maxPrice })`
- `liquidityPoolWithdraw({ liquidityPoolID, amount, minAmountA, minAmountB })`

**Soroban:**
- `invokeHostFunction({ hostFunction, auth })`
- `extendFootprintTtl({ extendTo })`
- `restoreFootprint()`

### Helper Functions

```typescript
import {
  parsePublicKey, parseMuxedAccount,
  nativeAsset, creditAsset,
  memoNone, memoText, memoId, memoHash, memoReturn,
} from '@stellar/tx-builder';

// Address parsing
parsePublicKey('G...');       // AccountID
parseMuxedAccount('G...');    // MuxedAccount { Ed25519: ... }
parseMuxedAccount('M...');    // MuxedAccount { MuxedEd25519: { id, ed25519 } }

// Asset construction
nativeAsset();                      // 'Native'
creditAsset('USD', 'G...');         // { CreditAlphanum4: ... }
creditAsset('USDC_LONG', 'G...');   // { CreditAlphanum12: ... }

// Memo construction
memoNone();                 // 'None'
memoText('hello');          // { Text: 'hello' }
memoId(123n);               // { Id: 123n }
memoHash(bytes32);          // { Hash: bytes32 }
memoReturn(bytes32);        // { Return: bytes32 }
```

### `Networks`

```typescript
import { Networks } from '@stellar/tx-builder';

Networks.PUBLIC;     // 'Public Global Stellar Network ; September 2015'
Networks.TESTNET;    // 'Test SDF Network ; September 2015'
Networks.FUTURENET;  // 'Test SDF Future Network ; October 2022'
```

### Hash Utilities

```typescript
import { sha256, transactionHash, feeBumpTransactionHash, networkId } from '@stellar/tx-builder';

const hash = await sha256(data);
const netId = await networkId(Networks.PUBLIC);
const txHash = await transactionHash(tx, Networks.PUBLIC);
const fbHash = await feeBumpTransactionHash(feeBumpTx, Networks.PUBLIC);
```

## License

Apache-2.0
