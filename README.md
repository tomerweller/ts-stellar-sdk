# ts-stellar-xdr

Modern TypeScript replacement for Stellar's official JS library stack. Zero runtime dependencies, fully type-safe, ESM only.

## Packages

| Package | Description | Dependencies | Status |
|---|---|---|---|
| [`@stellar/strkey`](./packages/strkey/) | Stellar address encoding (Base32 + CRC16-XModem) | none | done |
| [`@stellar/xdr`](./packages/xdr/) | XDR codec library with auto-generated Stellar types | `@stellar/strkey` | done |
| [`@stellar/tx-builder`](./packages/tx-builder/) | Transaction building, signing, keypairs | `@stellar/xdr` | done |
| [`@stellar/rpc-client`](./packages/rpc-client/) | JSON-RPC client for Soroban RPC | `@stellar/xdr` | done |
| [`@stellar/friendbot-client`](./packages/friendbot-client/) | Friendbot faucet client | none | done |

## Key Differences vs Official Stellar JS SDK

| Aspect | Official JS (`stellar-sdk`) | This Project |
|---|---|---|
| **Structs** | Class instances with `_attributes`, getter methods | Plain readonly objects |
| **Enums** | Enum instances with `.name`/`.value` | String literals (`'native'`) |
| **64-bit ints** | Custom `Hyper`/`UnsignedHyper` classes | Native `bigint` |
| **Unions** | `.switch()`, `.arm()`, `.value()` methods | Externally-tagged: `{ armName: value }` |
| **JSON** | Not supported in js-xdr | SEP-0051 aligned `toJson()`/`fromJson()` |
| **Optionals** | `null` / instance | `T \| null` |
| **Validation** | `instanceof` checks | Structural typing |
| **Dependencies** | Runtime dependencies | Zero runtime dependencies |
| **Module format** | CommonJS + ESM | ESM only |

## Quick Start

```bash
npm install        # install deps + workspace symlinks
npm run build      # build all packages (strkey → xdr → tx-builder → rpc-client → friendbot-client)
npm test           # run all 614 tests
```

Requires Node.js >= 18.

## Design Principles

1. **Type safety first** — leverage TypeScript's type system for compile-time correctness. Externally-tagged unions, string-literal enums, and readonly interfaces.
2. **SEP-0051 alignment** — JSON serialization follows the Stellar ecosystem standard.
3. **Zero runtime dependencies** — no production dependencies across all packages.
4. **Codec composability** — small, composable codec building blocks that combine to represent any XDR schema.
5. **Correctness** — strict validation of values, padding, and limits. Cross-verified against `rs-stellar-xdr` and `rs-stellar-strkey`.
6. **Simplicity** — minimal API surface. One way to do things.

## Replaces

This project replaces the following packages from Stellar's official JS stack:

- [`@stellar/js-xdr`](https://github.com/stellar/js-xdr) → `@stellar/xdr`
- [`@stellar/stellar-base`](https://github.com/stellar/js-stellar-base) → `@stellar/tx-builder`
- [`@stellar/stellar-sdk`](https://github.com/stellar/js-stellar-sdk) (Soroban RPC) → `@stellar/rpc-client`

## Project Structure

```
packages/
  strkey/       # standalone address encoding, zero deps
  xdr/          # XDR codecs, generated Stellar types, code generator
  tx-builder/   # transactions, operations, keypairs, signing
  rpc-client/       # Soroban RPC JSON-RPC client
  friendbot-client/ # Friendbot faucet client
```

See each package's README for detailed API documentation.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE) for details.
