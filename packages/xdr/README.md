# @stellar/xdr

TypeScript-first [XDR (RFC 4506)](https://www.rfc-editor.org/rfc/rfc4506) codec library for the [Stellar network](https://stellar.org). Zero runtime dependencies, fully type-safe, with support for binary, Base64, and JSON formats. JSON serialization is aligned with [SEP-0051](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0051.md). Includes auto-generated types for all Stellar XDR schemas.

## Installation

```bash
npm install @stellar/xdr
```

Requires Node.js >= 18.

## Comparison with `@stellar/js-xdr`

| | `@stellar/js-xdr` | `@stellar/xdr` |
|---|---|---|
| **Language** | JavaScript | TypeScript |
| **Type safety** | None built-in (requires separate `dts-xdr`) | First-class — types inferred from codec definitions |
| **Data model** | Class instances with `_attributes` | Plain readonly objects |
| **Structs** | `new Struct({ field: value })`, `obj.field()` getters | `{ field: value }`, direct property access |
| **Enums** | Enum instances with `.name`/`.value`, factory methods | String literals (`'native'`), integer values as properties |
| **Unions** | `new Union(switch, value)`, `.switch()`/`.arm()`/`.value()` | Externally-tagged: `'native'` or `{ credit_alphanum4: {...} }` |
| **64-bit integers** | Custom `Hyper`/`UnsignedHyper` classes | Native `bigint` |
| **Optionals** | `null` / instance | `T \| null` |
| **JSON** | Not supported | SEP-0051 aligned `toJson()`/`fromJson()` |
| **Validation** | `instanceof` checks | Structural typing |
| **Dependencies** | Runtime dependencies | Zero runtime dependencies |
| **Module format** | CommonJS + ESM | ESM only |
| **Limits** | Depth tracking only | Depth + byte-count tracking |

### Example: reading an Asset

**`@stellar/js-xdr`:**
```javascript
const asset = Asset.fromXDR(bytes);
asset.switch().name;             // 'assetTypeCreditAlphanum4'
asset.alphaNum4().assetCode();   // Buffer
```

**`@stellar/xdr`:**
```typescript
const asset = Asset.fromXdr(bytes);
if (is(asset, 'CreditAlphanum4')) {
  asset.CreditAlphanum4.asset_code; // Uint8Array
}
asset === 'Native'; // true for native assets
```

## Quick Start

```typescript
import {
  int32, uint32, bool, xdrString,
  fixedOpaque, varArray, option,
  xdrStruct, xdrEnum, taggedUnion, is,
} from '@stellar/xdr';

// Define an enum
const Color = xdrEnum({ red: 0, green: 1, blue: 2 });
Color.red;   // 0
Color.green; // 1

const bytes = Color.toXdr('red');
const color = Color.fromXdr(bytes); // 'red'

// Define a struct
interface Point { readonly x: number; readonly y: number; }

const Point = xdrStruct<Point>([
  ['x', int32],
  ['y', int32],
]);

const encoded = Point.toXdr({ x: 10, y: 20 });
const decoded = Point.fromXdr(encoded); // { x: 10, y: 20 }

// Base64 and JSON
const base64 = Point.toBase64({ x: 10, y: 20 });
const json = Point.toJson({ x: 10, y: 20 });
```

## Type Mapping

| XDR Type | TypeScript Type | Codec |
|---|---|---|
| `int` | `number` | `int32` |
| `unsigned int` | `number` | `uint32` |
| `hyper` | `bigint` | `int64` |
| `unsigned hyper` | `bigint` | `uint64` |
| `float` | `number` | `float32` |
| `double` | `number` | `float64` |
| `bool` | `boolean` | `bool` |
| `void` | `void` | `xdrVoid` |
| `opaque[N]` | `Uint8Array` | `fixedOpaque(N)` |
| `opaque<N>` | `Uint8Array` | `varOpaque(N)` |
| `string<N>` | `string` | `xdrString(N)` |
| `T[N]` | `readonly T[]` | `fixedArray(N, codec)` |
| `T<N>` | `readonly T[]` | `varArray(N, codec)` |
| `T*` | `T \| null` | `option(codec)` |
| `struct` | `readonly interface` | `xdrStruct([...])` |
| `enum` | String literal union | `xdrEnum({...})` |
| `union switch` (void arm) | `string` | `taggedUnion({...})` |
| `union switch` (value arm) | `{ key: T }` | `taggedUnion({...})` |

## API

### Codec Interface

Every codec implements `XdrCodec<T>`:

```typescript
interface XdrCodec<T> {
  // Binary serialization
  encode(writer: XdrWriter, value: T): void;
  decode(reader: XdrReader): T;
  toXdr(value: T, limits?: Limits): Uint8Array;
  fromXdr(input: Uint8Array | ArrayBufferLike, limits?: Limits): T;

  // Base64
  toBase64(value: T, limits?: Limits): string;
  fromBase64(input: string, limits?: Limits): T;

  // JSON (SEP-0051)
  toJsonValue(value: T): unknown;
  fromJsonValue(json: unknown): T;
  toJson(value: T): string;
  fromJson(input: string): T;
}
```

### Primitives

```typescript
import { int32, uint32, int64, uint64, float32, float64, bool, xdrVoid } from '@stellar/xdr';

int32.toXdr(-42);       // Uint8Array
uint64.toXdr(100n);     // bigint for 64-bit types
bool.toXdr(true);
```

### Containers

```typescript
import { fixedOpaque, varOpaque, xdrString, fixedArray, varArray, option } from '@stellar/xdr';

const hash = fixedOpaque(32);          // Fixed-length opaque (padded to 4-byte boundary)
const payload = varOpaque(1024);       // Variable-length opaque with max size
const name = xdrString(100);           // UTF-8 string with max length
const triple = fixedArray(3, int32);   // Fixed-length array
const list = varArray(10, int32);      // Variable-length array with max elements

const maybeInt = option(int32);        // Optional value (null = absent)
maybeInt.toXdr(42);    // present
maybeInt.toXdr(null);  // absent
```

### Structs

```typescript
import { xdrStruct, int32, xdrString } from '@stellar/xdr';

interface Person { readonly name: string; readonly age: number; }

const Person = xdrStruct<Person>([
  ['name', xdrString(100)],
  ['age', int32],
]);

const bytes = Person.toXdr({ name: 'Alice', age: 30 });
```

### Enums

String literals for type safety, integer values as properties:

```typescript
import { xdrEnum } from '@stellar/xdr';

type AssetType = 'native' | 'credit_alphanum4' | 'credit_alphanum12';

const AssetType = xdrEnum({
  native: 0,
  credit_alphanum4: 1,
  credit_alphanum12: 2,
});

AssetType.native;           // 0
AssetType.toXdr('native');  // encodes as int32
```

### Tagged Unions

Externally-tagged format (SEP-0051). Void arms are plain strings, value arms are single-key objects:

```typescript
import { taggedUnion, xdrEnum, is } from '@stellar/xdr';

const Asset = taggedUnion({
  switchOn: AssetType,
  arms: [
    { tags: ['native'] },
    { tags: ['credit_alphanum4'], codec: AlphaNum4 },
    { tags: ['credit_alphanum12'], codec: AlphaNum12 },
  ],
});

// Encode
Asset.toXdr('native');
Asset.toXdr({ credit_alphanum4: { asset_code, issuer } });

// Decode and match
const asset = Asset.fromXdr(bytes);
if (asset === 'native') { /* void arm */ }
if (is(asset, 'credit_alphanum4')) {
  asset.credit_alphanum4.asset_code; // narrowed type
}
```

For int-discriminated unions, provide an explicit `key`:

```typescript
const TransactionExt = taggedUnion({
  switchOn: int32,
  arms: [{ tags: [0], key: 'v0' }],
});
```

### `is()` Type Guard

```typescript
import { is } from '@stellar/xdr';

const asset = Asset.fromXdr(bytes);
if (is(asset, 'credit_alphanum4')) {
  // TypeScript narrows: asset is { credit_alphanum4: AlphaNum4 }
  console.log(asset.credit_alphanum4.asset_code);
}
```

### JSON (SEP-0051)

```typescript
const json = Asset.toJson('native');          // '"native"'
const json2 = uint64.toJson(100n);            // '"100"' (bigint as string)
const json3 = fixedOpaque(4).toJson(bytes);   // '"deadbeef"' (hex)

const asset = Asset.fromJson('"native"');
const val = uint64.fromJson('"100"');          // 100n

// Low-level: JSON-safe values without string wrapper
const jsonVal = Asset.toJsonValue('native');
const restored = Asset.fromJsonValue(jsonVal);
```

### Lazy (Circular Dependencies)

```typescript
import { lazy } from '@stellar/xdr';

const Tree: XdrCodec<Tree> = xdrStruct<Tree>([
  ['value', int32],
  ['children', varArray(10, lazy(() => Tree))],
]);
```

### Reader & Writer

```typescript
import { XdrReader, XdrWriter } from '@stellar/xdr';

// Write
const writer = new XdrWriter();
writer.writeInt32(42);
writer.writeString('hello');
const bytes = writer.toUint8Array();

// Read
const reader = new XdrReader(bytes);
reader.readInt32();  // 42
reader.readString(); // 'hello'
reader.ensureEnd();  // throws if bytes remain
```

### Hex Utilities

```typescript
import { bytesToHex, hexToBytes } from '@stellar/xdr';

bytesToHex(new Uint8Array([0xde, 0xad])); // 'dead'
hexToBytes('dead');                        // Uint8Array([0xde, 0xad])
```

### Limits

Control resource consumption with depth and byte limits:

```typescript
import { DEFAULT_LIMITS } from '@stellar/xdr';
// Default: { depth: 512, len: 256 * 1024 * 1024 }

const decoded = SomeType.fromXdr(bytes, { depth: 100, len: 1024 });
```

### Error Handling

All errors throw `XdrError` with a typed error code:

```typescript
import { XdrError, XdrErrorCode } from '@stellar/xdr';

try {
  SomeType.fromXdr(malformedBytes);
} catch (err) {
  if (err instanceof XdrError) {
    err.code; // XdrErrorCode.BufferUnderflow, InvalidValue, etc.
  }
}
```

Error codes: `InvalidValue`, `LengthExceedsMax`, `LengthMismatch`, `NonZeroPadding`, `BufferUnderflow`, `BufferNotFullyConsumed`, `DepthLimitExceeded`, `ByteLimitExceeded`, `InvalidEnumValue`, `InvalidUnionDiscriminant`, `Utf8Error`.

## Generated Stellar Types

The package includes auto-generated codecs for all Stellar XDR types in `generated/stellar_generated.ts`. Generated code uses TypeScript's type-value duality pattern — the same identifier serves as both the type and the codec:

```typescript
import { Asset, TransactionEnvelope, Operation } from '@stellar/xdr';

// Use as a type
const asset: Asset = 'Native';

// Use as a codec
const bytes = Asset.toXdr(asset);
const decoded = Asset.fromXdr(bytes);
```

## Code Generation

Types are generated from `.x` schema files using a TypeScript backend for [`stellar/xdrgen`](https://github.com/stellar/xdrgen). The generator (`generator/typescript.rb`) and vendored schemas live in this package:

```
packages/xdr/
  generator/typescript.rb    # xdrgen TypeScript backend (Ruby)
  vendor/xdrgen/             # vendored xdrgen tool
  vendor/xdr/                # Stellar .x schema files
  generated/                 # output: stellar_generated.ts
```

## License

Apache-2.0
