# @stellar/friendbot-client

Lightweight client for Stellar's Friendbot faucet service. Zero dependencies.

## Installation

```bash
npm install @stellar/friendbot-client
```

## Usage

```typescript
import { FriendbotClient } from '@stellar/friendbot-client';

// Create a client
const bot = new FriendbotClient('https://friendbot.stellar.org');

// Fund an account
const result = await bot.fund('GABC...');
console.log(result.hash); // transaction hash

// One-shot static method
const result = await FriendbotClient.fund('GABC...', 'https://friendbot.stellar.org');
```

### Options

```typescript
// Allow HTTP URLs (default: false)
const bot = new FriendbotClient('http://localhost:8000', { allowHttp: true });
```

## API

### `new FriendbotClient(url, opts?)`

Creates a new client pointed at the given Friendbot URL.

- `url` — Friendbot service URL
- `opts.allowHttp` — Allow `http://` URLs (default: `false`)

### `client.fund(address): Promise<FriendbotResponse>`

Funds the given Stellar address. Returns `{ hash }` on success, throws `FriendbotError` on failure.

### `FriendbotClient.fund(address, url, opts?): Promise<FriendbotResponse>`

Static convenience for one-shot funding without creating a client instance.

### `FriendbotError`

Thrown on non-2xx responses. Properties:

- `status` — HTTP status code
- `message` — Error message
- `detail` — Response body detail (if available)

## License

Apache-2.0
