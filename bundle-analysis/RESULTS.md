# Bundle Size Analysis

Comparison of production bundle sizes for an identical "create account" transaction example across three Stellar SDK approaches.

## The Example

Each bundle implements the same workflow:
1. Generate two Ed25519 keypairs (Alice & Bob)
2. Fund Alice via Friendbot
3. Fetch Alice's account/sequence number via Soroban RPC
4. Build a `CreateAccount` transaction (10 XLM to Bob)
5. Sign and submit via RPC

## Results

### Browser bundles (esbuild --minify --platform=browser --target=es2022)

| Bundle | Raw | Gzip | vs Official |
|--------|----:|-----:|:-----------:|
| **Modern** (`tx-builder` + `rpc-client` + `friendbot-client`) | **75.6 KB** | **22.5 KB** | **13.2x smaller** |
| **Compat** (`stellar-sdk-comp`) | **341.2 KB** | **80.4 KB** | **2.9x smaller** |
| Official (`@stellar/stellar-sdk` v14.5.0) | 995.6 KB | 271.8 KB | 1x (baseline) |
| Official `/minimal` variant | 838.1 KB | 217.9 KB | 1.2x smaller |

### Size reduction summary

| Metric | Modern vs Official | Compat vs Official | Modern vs Compat |
|--------|-------------------:|-------------------:|-----------------:|
| Raw | **-92.4%** (920 KB saved) | **-65.7%** (654 KB saved) | **-77.8%** |
| Gzip | **-91.7%** (249 KB saved) | **-70.4%** (191 KB saved) | **-72.0%** |

## What's in each bundle?

### Modern (75.6 KB)

| Module | Size | % |
|--------|-----:|--:|
| `stellar_generated.js` (XDR type definitions) | 41.0 KB | 54% |
| `@noble/ed25519` (Ed25519 crypto) | 6.7 KB | 9% |
| `rpc-client` (parsers, client, assembly) | ~6 KB | 8% |
| XDR codecs (composites, containers, reader, writer) | ~10 KB | 13% |
| `tx-builder` (keypair, builder, operations) | ~5 KB | 7% |
| `friendbot-client` | ~1 KB | 1% |
| Other (strkey, primitives, errors) | ~6 KB | 8% |

### Compat SDK (341.2 KB)

| Module | Size | % |
|--------|-----:|--:|
| `stellar_compat.js` (compat XDR type wrappers) | 123.8 KB | 36% |
| `stellar_generated.js` (XDR type definitions) | 42.6 KB | 12% |
| `operation.js` (26 operation factories + decoder) | 25.4 KB | 7% |
| `rpc-client` (Soroban RPC) | 13.7 KB | 4% |
| XDR codecs (composites, containers, reader, writer) | 13.6 KB | 4% |
| `@noble/ed25519` (Ed25519 crypto) | 6.9 KB | 2% |
| `transaction.js` + `transaction-builder.js` | 12.9 KB | 4% |
| `@noble/hashes` (SHA-256/512 for sync operations) | 5.6 KB | 2% |
| `contract/assembled-transaction.js` | 4.3 KB | 1% |
| `strkey` (address encoding) | 4.0 KB | 1% |
| `tx-builder` (operations, helpers) | 3.3 KB | 1% |
| Other (keypair, asset, memo, auth, seps, etc.) | ~85 KB | 25% |

**Compat overhead vs Modern: +265.6 KB (+351%)**. The extra cost comes from:
- Compat XDR type wrappers (`stellar_compat.js`): +123.8 KB — wraps every generated XDR type with `.switch()`, `.arm()`, `.value()` accessors to match the official SDK's class-based API
- Operation decoder (`operation.js`): +25.4 KB — decodes XDR operations into flat objects with 26+ operation types, plus full parity with js-stellar-base Operation API
- `@noble/hashes` for sync Keypair/hash: +5.6 KB
- Transaction/builder compat layer: +12.9 KB
- SEPs, auth, contract utilities: ~40 KB
- Other compat wrappers (Asset, Memo, Account, Claimant, Address, etc.): ~45 KB

### Official SDK (995.6 KB)

The official SDK ships a pre-bundled `stellar-sdk.min.js` (994.4 KB) as its browser entry point. esbuild cannot tree-shake it further. The SDK includes:
- `stellar-base` (XDR, crypto, transaction building)
- `axios` HTTP client
- `eventsource` polyfill
- `urijs` URL manipulation
- `bignumber.js`
- Buffer polyfills
- Horizon server + call builders
- Soroban RPC server

## Official SDK variant bundles (pre-built)

| Variant | Raw | Gzip |
|---------|----:|-----:|
| `stellar-sdk.min.js` (full) | 968.9 KB | 249.9 KB |
| `stellar-sdk-no-axios.min.js` | 943.4 KB | 238.7 KB |
| `stellar-sdk-no-eventsource.min.js` | 840.4 KB | 209.6 KB |
| `stellar-sdk-minimal.min.js` (no axios, no eventsource) | 814.9 KB | 199.0 KB |

Even the minimal official variant (815 KB) is **10.8x larger** than the modern bundle (75.6 KB) and **2.4x larger** than the compat bundle (341.2 KB).

## Why the difference?

1. **ESM + tree-shaking**: The modern packages are pure ESM with granular exports. Bundlers can eliminate unused code. The official SDK ships a pre-bundled UMD blob that cannot be tree-shaken.

2. **Zero polyfills**: The modern packages use native `fetch`, `crypto.subtle`, `Uint8Array`, and `BigInt`. The official SDK bundles polyfills for `Buffer`, `EventSource`, and HTTP client libraries.

3. **No class hierarchies**: The modern packages use plain objects, string literals, and codec composition instead of deep class inheritance trees. This produces smaller, more shakeable code.

4. **Single-purpose packages**: Importing `@stellar/tx-builder` + `@stellar/rpc-client` pulls in only what's needed. Importing `@stellar/stellar-sdk` pulls in everything (Horizon, Soroban, contract client, etc.) in one monolithic bundle.

## Why is the compat bundle larger than the modern bundle?

The compat layer is 341.2 KB vs the modern bundle's 75.6 KB. The biggest contributor is `stellar_compat.js` (123.8 KB), which wraps every XDR type with class-like accessors (`.switch()`, `.arm()`, `.value()`, `.toXDR()`, etc.) to match the official SDK's API surface. The full parity implementation (99.5% of js-stellar-base test suite passing) also adds the complete Operation API (25.4 KB), transaction builder/parser (12.9 KB), auth utilities, SEP implementations, and other compat wrappers needed to be a drop-in replacement for `@stellar/stellar-sdk`.

Despite this, the compat bundle is still **2.9x smaller** than the official SDK because it avoids polyfills (Buffer, EventSource), bundled HTTP clients (axios), and other legacy dependencies.

## Methodology

- **Bundler**: esbuild v0.21.5
- **Settings**: `--bundle --minify --format=esm --target=es2022 --platform=browser`
- **Measurement**: `wc -c` (raw), `gzip -c | wc -c` (gzip)
- **Date**: 2026-03-01
- **Official SDK version**: @stellar/stellar-sdk v14.5.0
