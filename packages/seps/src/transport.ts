const MAX_RESPONSE_SIZE = 100 * 1024; // 100 KB
const DEFAULT_TIMEOUT = 10_000;

export interface TransportOptions {
  allowHttp?: boolean;
  timeout?: number;
}

function validateUrl(url: string, allowHttp: boolean): void {
  if (!allowHttp && url.startsWith('http://')) {
    throw new Error(
      'Cannot use insecure HTTP. Pass allowHttp: true to allow.',
    );
  }
}

export async function httpGetText(
  url: string,
  opts?: TransportOptions,
): Promise<string> {
  validateUrl(url, opts?.allowHttp ?? false);
  const timeout = opts?.timeout ?? DEFAULT_TIMEOUT;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const contentLength = res.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
    throw new Error(`Response too large: ${contentLength} bytes`);
  }
  const text = await res.text();
  if (text.length > MAX_RESPONSE_SIZE) {
    throw new Error(`Response too large: ${text.length} bytes`);
  }
  return text;
}

export async function httpGetJson<T>(
  url: string,
  opts?: TransportOptions,
): Promise<T> {
  validateUrl(url, opts?.allowHttp ?? false);
  const timeout = opts?.timeout ?? DEFAULT_TIMEOUT;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const contentLength = res.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
    throw new Error(`Response too large: ${contentLength} bytes`);
  }
  return res.json() as Promise<T>;
}
