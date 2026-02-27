import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveStellarToml } from '../src/sep1.js';
import { StellarTomlError } from '../src/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

function mockFetchText(status: number, body: string, headers?: Record<string, string>) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Not Found',
    headers: new Headers(headers),
    text: () => Promise.resolve(body),
  });
  globalThis.fetch = fn;
  return fn;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// resolveStellarToml
// ---------------------------------------------------------------------------

describe('resolveStellarToml', () => {
  it('fetches and parses a valid stellar.toml', async () => {
    const tomlContent = `
FEDERATION_SERVER = "https://example.com/federation"
SIGNING_KEY = "GABCDEFG"

[DOCUMENTATION]
ORG_NAME = "Example Org"
`;
    const fetchFn = mockFetchText(200, tomlContent);

    const result = await resolveStellarToml('example.com');

    expect(result['FEDERATION_SERVER']).toBe('https://example.com/federation');
    expect(result['SIGNING_KEY']).toBe('GABCDEFG');
    const doc = result['DOCUMENTATION'] as Record<string, unknown>;
    expect(doc['ORG_NAME']).toBe('Example Org');

    const calledUrl = fetchFn.mock.calls[0]![0] as string;
    expect(calledUrl).toBe('https://example.com/.well-known/stellar.toml');
  });

  it('uses HTTPS by default', async () => {
    const fetchFn = mockFetchText(200, 'VERSION = "2.0.0"');

    await resolveStellarToml('example.com');

    const calledUrl = fetchFn.mock.calls[0]![0] as string;
    expect(calledUrl).toMatch(/^https:\/\//);
  });

  it('uses HTTP when allowHttp is true', async () => {
    const fetchFn = mockFetchText(200, 'VERSION = "2.0.0"');

    await resolveStellarToml('localhost:8000', { allowHttp: true });

    const calledUrl = fetchFn.mock.calls[0]![0] as string;
    expect(calledUrl).toMatch(/^http:\/\//);
  });

  it('throws StellarTomlError on HTTP failure', async () => {
    mockFetchText(404, 'Not Found');

    await expect(resolveStellarToml('missing.com')).rejects.toThrow(StellarTomlError);
  });

  it('throws StellarTomlError on invalid TOML', async () => {
    mockFetchText(200, '{{invalid toml content');

    await expect(resolveStellarToml('bad.com')).rejects.toThrow(StellarTomlError);
  });

  it('throws StellarTomlError on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(resolveStellarToml('down.com')).rejects.toThrow(StellarTomlError);
  });

  it('throws on response too large', async () => {
    mockFetchText(200, '', { 'content-length': '200000' });

    await expect(resolveStellarToml('big.com')).rejects.toThrow(StellarTomlError);
  });

  it('respects timeout option', async () => {
    mockFetchText(200, 'VERSION = "1"');

    await resolveStellarToml('example.com', { timeout: 5000 });

    const calledOpts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    expect(calledOpts.signal).toBeDefined();
  });
});
