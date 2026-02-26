import { describe, it, expect, vi, afterEach } from 'vitest';
import { FriendbotClient } from '../src/client.js';
import { FriendbotError } from '../src/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_URL = 'https://friendbot.stellar.org';
const TEST_ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const originalFetch = globalThis.fetch;

function mockFetchResponse(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  globalThis.fetch = fn;
  return fn;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe('FriendbotClient constructor', () => {
  it('accepts https URLs', () => {
    const client = new FriendbotClient(TEST_URL);
    expect(client.url).toBe(TEST_URL);
  });

  it('rejects http URLs by default', () => {
    expect(() => new FriendbotClient('http://localhost:8000')).toThrow(FriendbotError);
  });

  it('allows http with allowHttp option', () => {
    const client = new FriendbotClient('http://localhost:8000', { allowHttp: true });
    expect(client.url).toBe('http://localhost:8000');
  });
});

// ---------------------------------------------------------------------------
// fund()
// ---------------------------------------------------------------------------

describe('fund', () => {
  it('returns hash on success', async () => {
    const fetchFn = mockFetchResponse(200, {
      hash: 'abc123def456',
      result_xdr: 'AAAA',
      envelope_xdr: 'BBBB',
    });

    const client = new FriendbotClient(TEST_URL);
    const result = await client.fund(TEST_ADDRESS);

    expect(result.hash).toBe('abc123def456');
    expect(fetchFn).toHaveBeenCalledOnce();

    const calledUrl = fetchFn.mock.calls[0]![0];
    expect(calledUrl).toBe(`${TEST_URL}?addr=${TEST_ADDRESS}`);
  });

  it('throws FriendbotError on non-200 with JSON detail', async () => {
    mockFetchResponse(400, {
      detail: 'account already exists',
    });

    const client = new FriendbotClient(TEST_URL);
    await expect(client.fund(TEST_ADDRESS)).rejects.toThrow(FriendbotError);

    try {
      await client.fund(TEST_ADDRESS);
    } catch (e) {
      const err = e as FriendbotError;
      expect(err.status).toBe(400);
      expect(err.detail).toBe('account already exists');
      expect(err.message).toContain('400');
    }
  });

  it('throws FriendbotError on non-200 with message field', async () => {
    mockFetchResponse(500, {
      message: 'internal server error',
    });

    const client = new FriendbotClient(TEST_URL);

    try {
      await client.fund(TEST_ADDRESS);
    } catch (e) {
      const err = e as FriendbotError;
      expect(err.status).toBe(500);
      expect(err.detail).toBe('internal server error');
    }
  });
});

// ---------------------------------------------------------------------------
// Static fund()
// ---------------------------------------------------------------------------

describe('FriendbotClient.fund (static)', () => {
  it('works as a one-shot convenience', async () => {
    const fetchFn = mockFetchResponse(200, { hash: 'static-hash-123' });

    const result = await FriendbotClient.fund(TEST_ADDRESS, TEST_URL);
    expect(result.hash).toBe('static-hash-123');
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('rejects http URLs without allowHttp', async () => {
    await expect(
      FriendbotClient.fund(TEST_ADDRESS, 'http://localhost:8000'),
    ).rejects.toThrow(FriendbotError);
  });

  it('allows http URLs with allowHttp', async () => {
    mockFetchResponse(200, { hash: 'http-hash' });

    const result = await FriendbotClient.fund(TEST_ADDRESS, 'http://localhost:8000', {
      allowHttp: true,
    });
    expect(result.hash).toBe('http-hash');
  });
});
