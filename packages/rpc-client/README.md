# @stellar/rpc-client

JSON-RPC client for Stellar's Soroban RPC server. Typed responses, automatic XDR decoding, and convenience methods for common operations. Depends on `@stellar/xdr`.

## Installation

```bash
npm install @stellar/rpc-client
```

## Quick Start

```typescript
import { RpcClient } from '@stellar/rpc-client';

const rpc = new RpcClient('https://soroban-testnet.stellar.org');

// Check server health
const health = await rpc.getHealth();
console.log(health.status); // 'healthy'

// Get account info
const account = await rpc.getAccount('G...');

// Send a transaction
const result = await rpc.sendTransaction(envelope);
const tx = await rpc.pollTransaction(result.hash);
```

## `RpcClient`

### Construction

```typescript
const rpc = new RpcClient(url: string, opts?: RpcClientOptions);
```

**Options:**
- `allowHttp?: boolean` — Allow non-HTTPS URLs (default: `false`, throws `RpcError` for HTTP)
- `headers?: Record<string, string>` — Custom headers for every request

### RPC Methods

| Method | Signature |
|---|---|
| `getHealth()` | `() => Promise<GetHealthResponse>` |
| `getNetwork()` | `() => Promise<GetNetworkResponse>` |
| `getLatestLedger()` | `() => Promise<GetLatestLedgerResponse>` |
| `getVersionInfo()` | `() => Promise<GetVersionInfoResponse>` |
| `getFeeStats()` | `() => Promise<GetFeeStatsResponse>` |
| `getLedgerEntries(keys)` | `(keys: LedgerKey[]) => Promise<GetLedgerEntriesResponse>` |
| `getTransaction(hash)` | `(hash: string) => Promise<GetTransactionResponse>` |
| `getTransactions(req)` | `(req: PaginatedByLedger \| PaginatedByCursor) => Promise<GetTransactionsResponse>` |
| `getLedgers(req)` | `(req: PaginatedByLedger \| PaginatedByCursor) => Promise<GetLedgersResponse>` |
| `getEvents(req)` | `(req: PaginatedByLedger<EventsParams> \| PaginatedByCursor<EventsParams>) => Promise<GetEventsResponse>` |
| `sendTransaction(envelope)` | `(envelope: TransactionEnvelope) => Promise<SendTransactionResponse>` |
| `simulateTransaction(envelope, opts?)` | `(envelope: TransactionEnvelope, opts?: { resourceLeeway?: number; authMode?: SimulationAuthMode }) => Promise<SimulateTransactionResponse>` |

All XDR fields in responses are automatically decoded from base64 into typed XDR objects.

### Convenience Methods

#### `getAccount(address)`

Fetches an account's ledger entry by G-address. Returns a decoded `AccountEntry`.

```typescript
const account = await rpc.getAccount('G...');
```

#### `getContractData(contractId, key, durability?)`

Fetches a contract data entry. Returns `LedgerEntryResult | null`.

```typescript
const data = await rpc.getContractData('C...', scVal, 'persistent');
```

#### `pollTransaction(hash, opts?)`

Polls `getTransaction` until the transaction is found or attempts are exhausted.

```typescript
const tx = await rpc.pollTransaction(hash, {
  attempts: 10,
  sleepStrategy: (attempt) => 1000 * attempt, // backoff in ms
});
```

#### `prepareTransaction(envelope)`

Simulates a transaction and assembles the result. Shorthand for `simulateTransaction` + `assembleTransaction`.

```typescript
const prepared = await rpc.prepareTransaction(envelope);
```

## `assembleTransaction`

Applies simulation results to a Soroban transaction envelope:

```typescript
import { assembleTransaction } from '@stellar/rpc-client';

const assembled = assembleTransaction(envelope, simulation);
// Returns a new unsigned TransactionEnvelope with updated fees,
// resource data, and authorization entries
```

Requirements:
- Input must be a v1 `TransactionEnvelope`
- Must contain exactly one Soroban operation (`invokeHostFunction`, `extendFootprintTtl`, or `restoreFootprint`)
- Signatures are cleared (content changes invalidate previous signatures)

## Type Guards

```typescript
import {
  isSimulationError,
  isSimulationSuccess,
  isSimulationRestore,
} from '@stellar/rpc-client';

const sim = await rpc.simulateTransaction(envelope);

if (isSimulationError(sim)) {
  console.error(sim.error);
} else if (isSimulationSuccess(sim)) {
  if (isSimulationRestore(sim)) {
    // Transaction needs a restore preamble
    sim.restorePreamble; // { minResourceFee, transactionData }
  }
  sim.results;         // SimulationResult[]
  sim.minResourceFee;  // string
  sim.transactionData; // SorobanTransactionData
}
```

## `RpcError`

```typescript
import { RpcError } from '@stellar/rpc-client';

try {
  await rpc.getTransaction(hash);
} catch (err) {
  if (err instanceof RpcError) {
    err.code;    // number (JSON-RPC error code)
    err.message; // string
    err.data;    // unknown (optional server-provided details)
  }
}
```

## License

Apache-2.0
