import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveFederationAddress, queryFederationServer } from '../src/sep2.js';
import { FederationError } from '../src/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

/** Mock fetch to return different responses based on URL pattern */
function mockFetch(handler: (url: string) => { status: number; body: unknown; contentType?: string }) {
  const fn = vi.fn().mockImplementation((url: string | URL) => {
    const urlStr = url.toString();
    const { status, body, contentType } = handler(urlStr);
    const isText = contentType === 'text/plain';
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: new Headers(),
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(isText ? body as string : JSON.stringify(body)),
    });
  });
  globalThis.fetch = fn;
  return fn;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// queryFederationServer
// ---------------------------------------------------------------------------

describe('queryFederationServer', () => {
  it('queries a federation server with params', async () => {
    const fetchFn = mockFetch(() => ({
      status: 200,
      body: {
        account_id: 'GABCDEF',
        stellar_address: 'alice*example.com',
      },
    }));

    const result = await queryFederationServer(
      'https://example.com/federation',
      { type: 'name', q: 'alice*example.com' },
      { allowHttp: true },
    );

    expect(result.account_id).toBe('GABCDEF');
    expect(result.stellar_address).toBe('alice*example.com');

    const calledUrl = fetchFn.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('type=name');
    expect(calledUrl).toContain('q=alice');
  });

  it('throws FederationError on HTTP failure', async () => {
    mockFetch(() => ({ status: 404, body: { detail: 'not found' } }));

    await expect(
      queryFederationServer('https://example.com/federation', { type: 'name', q: 'bob*example.com' }),
    ).rejects.toThrow(FederationError);
  });

  it('throws FederationError when response missing account_id', async () => {
    mockFetch(() => ({ status: 200, body: { stellar_address: 'alice*example.com' } }));

    await expect(
      queryFederationServer('https://example.com/federation', { type: 'name', q: 'alice*example.com' }),
    ).rejects.toThrow(FederationError);
  });

  it('throws FederationError when memo is not a string', async () => {
    mockFetch(() => ({
      status: 200,
      body: { account_id: 'GABCDEF', memo: 12345 },
    }));

    await expect(
      queryFederationServer('https://example.com/federation', { type: 'name', q: 'alice*example.com' }),
    ).rejects.toThrow(FederationError);
  });
});

// ---------------------------------------------------------------------------
// resolveFederationAddress
// ---------------------------------------------------------------------------

describe('resolveFederationAddress', () => {
  it('returns immediately for G-addresses without fetching', async () => {
    // 56 chars: G + 55 base32 characters
    const gAddress = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW';

    const result = await resolveFederationAddress(gAddress);

    expect(result.account_id).toBe(gAddress);
    // fetch should not have been called
  });

  it('resolves a federated name*domain address', async () => {
    mockFetch((url) => {
      if (url.includes('.well-known/stellar.toml')) {
        return {
          status: 200,
          body: 'FEDERATION_SERVER = "https://example.com/federation"',
          contentType: 'text/plain',
        };
      }
      return {
        status: 200,
        body: {
          account_id: 'GRESULTADDRESS',
          stellar_address: 'alice*example.com',
          memo_type: 'text',
          memo: 'hello',
        },
      };
    });

    const result = await resolveFederationAddress('alice*example.com', { allowHttp: true });

    expect(result.account_id).toBe('GRESULTADDRESS');
    expect(result.stellar_address).toBe('alice*example.com');
    expect(result.memo_type).toBe('text');
    expect(result.memo).toBe('hello');
  });

  it('throws on invalid federation address format', async () => {
    await expect(resolveFederationAddress('invalid-address')).rejects.toThrow(FederationError);
    await expect(resolveFederationAddress('too*many*stars')).rejects.toThrow(FederationError);
    await expect(resolveFederationAddress('*domain')).rejects.toThrow(FederationError);
    await expect(resolveFederationAddress('name*')).rejects.toThrow(FederationError);
  });

  it('throws when stellar.toml has no FEDERATION_SERVER', async () => {
    mockFetch(() => ({
      status: 200,
      body: 'SIGNING_KEY = "GABCDEF"',
      contentType: 'text/plain',
    }));

    await expect(
      resolveFederationAddress('alice*nofed.com', { allowHttp: true }),
    ).rejects.toThrow(FederationError);
  });

  it('throws when stellar.toml fetch fails', async () => {
    mockFetch(() => ({ status: 404, body: 'Not Found', contentType: 'text/plain' }));

    await expect(
      resolveFederationAddress('alice*missing.com'),
    ).rejects.toThrow(FederationError);
  });
});
