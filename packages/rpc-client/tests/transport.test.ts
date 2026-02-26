import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { jsonRpcPost } from '../src/transport.js';
import { RpcError } from '../src/errors.js';

describe('jsonRpcPost', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(response: { ok: boolean; status?: number; statusText?: string; json?: unknown }) {
    const fn = vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status ?? 200,
      statusText: response.statusText ?? 'OK',
      json: () => Promise.resolve(response.json ?? {}),
    });
    globalThis.fetch = fn;
    return fn;
  }

  it('sends a valid JSON-RPC 2.0 request', async () => {
    const fetchFn = mockFetch({
      ok: true,
      json: { jsonrpc: '2.0', id: 1, result: { status: 'healthy' } },
    });

    const result = await jsonRpcPost<{ status: string }>(
      'https://rpc.example.com',
      'getHealth',
      {},
    );

    expect(result).toEqual({ status: 'healthy' });

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://rpc.example.com');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.method).toBe('getHealth');
    expect(body.params).toEqual({});
    expect(typeof body.id).toBe('number');
  });

  it('passes custom headers', async () => {
    const fetchFn = mockFetch({
      ok: true,
      json: { jsonrpc: '2.0', id: 1, result: {} },
    });

    await jsonRpcPost('https://rpc.example.com', 'getHealth', {}, { Authorization: 'Bearer tok' });

    const [, init] = fetchFn.mock.calls[0]!;
    expect(init.headers['Authorization']).toBe('Bearer tok');
  });

  it('passes params in the request body', async () => {
    const fetchFn = mockFetch({
      ok: true,
      json: { jsonrpc: '2.0', id: 1, result: { txHash: 'abc' } },
    });

    await jsonRpcPost('https://rpc.example.com', 'getTransaction', { hash: 'abc123' });

    const body = JSON.parse(fetchFn.mock.calls[0]![1].body);
    expect(body.params).toEqual({ hash: 'abc123' });
  });

  it('throws RpcError on HTTP failure', async () => {
    mockFetch({ ok: false, status: 503, statusText: 'Service Unavailable' });

    await expect(
      jsonRpcPost('https://rpc.example.com', 'getHealth', {}),
    ).rejects.toThrow(RpcError);

    try {
      await jsonRpcPost('https://rpc.example.com', 'getHealth', {});
    } catch (e) {
      expect(e).toBeInstanceOf(RpcError);
      expect((e as RpcError).code).toBe(-1);
      expect((e as RpcError).message).toContain('503');
    }
  });

  it('throws RpcError on JSON-RPC error response', async () => {
    mockFetch({
      ok: true,
      json: {
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32600, message: 'Invalid Request', data: { detail: 'bad' } },
      },
    });

    try {
      await jsonRpcPost('https://rpc.example.com', 'getHealth', {});
    } catch (e) {
      expect(e).toBeInstanceOf(RpcError);
      expect((e as RpcError).code).toBe(-32600);
      expect((e as RpcError).message).toBe('Invalid Request');
      expect((e as RpcError).data).toEqual({ detail: 'bad' });
    }
  });

  it('increments request IDs', async () => {
    const fetchFn = mockFetch({
      ok: true,
      json: { jsonrpc: '2.0', id: 1, result: {} },
    });

    await jsonRpcPost('https://rpc.example.com', 'getHealth', {});
    await jsonRpcPost('https://rpc.example.com', 'getHealth', {});

    const id1 = JSON.parse(fetchFn.mock.calls[0]![1].body).id;
    const id2 = JSON.parse(fetchFn.mock.calls[1]![1].body).id;
    expect(id2).toBeGreaterThan(id1);
  });
});
