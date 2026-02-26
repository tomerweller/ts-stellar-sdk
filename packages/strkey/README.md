# @stellar/strkey

Standalone Stellar address encoding and decoding. Base32 with CRC16-XModem checksums, supporting all Stellar strkey types (G, S, M, T, X, P, C, L, B). Zero runtime dependencies.

## Installation

```bash
npm install @stellar/strkey
```

## Quick Start

```typescript
import { strkeyFromString, strkeyToString, encodeStrkey, decodeStrkey, STRKEY_ED25519_PUBLIC } from '@stellar/strkey';

// Parse a G-address into a typed object
const key = strkeyFromString('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
// { type: 'public_key_ed25519', data: Uint8Array(32) }

// Convert back to a string
const addr = strkeyToString(key);
// 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'

// Muxed accounts include an embedded ID
const muxed = strkeyFromString('MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2LQ');
// { type: 'muxed_account_ed25519', ed25519: Uint8Array(32), id: 0n }

// Low-level: encode/decode raw version byte + payload
const raw = decodeStrkey(addr); // { version: 48, payload: Uint8Array(32) }
const str = encodeStrkey(STRKEY_ED25519_PUBLIC, raw.payload);
```

## API

### `strkeyFromString(s: string): Strkey`

Parses a base32 strkey string into a typed `Strkey` object. Validates format, payload sizes, padding, and CRC16 checksum.

### `strkeyToString(strkey: Strkey): string`

Converts a typed `Strkey` object back to a base32 string.

### `encodeStrkey(versionByte: number, payload: Uint8Array): string`

Low-level encoder. Produces `base32(versionByte || payload || crc16(versionByte || payload))`.

### `decodeStrkey(str: string): { version: number; payload: Uint8Array }`

Low-level decoder. Validates CRC16 checksum and returns the raw version byte and payload.

### `encodeBase32(data: Uint8Array): string`

RFC 4648 base32 encoding (no padding).

### `decodeBase32(input: string): Uint8Array`

Strict base32 decoding. Rejects non-zero trailing bits.

### `crc16xmodem(data: Uint8Array): number`

CRC16-XModem checksum.

## `Strkey` Type

```typescript
type Strkey =
  | { type: 'public_key_ed25519'; data: Uint8Array }
  | { type: 'private_key_ed25519'; data: Uint8Array }
  | { type: 'pre_auth_tx'; data: Uint8Array }
  | { type: 'hash_x'; data: Uint8Array }
  | { type: 'muxed_account_ed25519'; ed25519: Uint8Array; id: bigint }
  | { type: 'signed_payload_ed25519'; ed25519: Uint8Array; payload: Uint8Array }
  | { type: 'contract'; data: Uint8Array }
  | { type: 'liquidity_pool'; data: Uint8Array }
  | { type: 'claimable_balance_v0'; data: Uint8Array };
```

## Version Byte Constants

| Constant | Prefix | Type |
|---|---|---|
| `STRKEY_ED25519_PUBLIC` | G | Public key |
| `STRKEY_ED25519_PRIVATE` | S | Private key |
| `STRKEY_MUXED_ED25519` | M | Muxed account |
| `STRKEY_PRE_AUTH_TX` | T | Pre-auth transaction |
| `STRKEY_HASH_X` | X | Hash-x |
| `STRKEY_SIGNED_PAYLOAD` | P | Signed payload |
| `STRKEY_CONTRACT` | C | Contract |
| `STRKEY_LIQUIDITY_POOL` | L | Liquidity pool |
| `STRKEY_CLAIMABLE_BALANCE` | B | Claimable balance |

## License

Apache-2.0
