import { RpcError } from './errors.js';

let nextId = 1;

export async function jsonRpcPost<T>(
  url: string,
  method: string,
  params: object,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });
  if (!res.ok) throw new RpcError(-1, `HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if ('error' in json) {
    throw new RpcError(json.error.code, json.error.message ?? '', json.error.data);
  }
  return json.result as T;
}
