// Access Buffer via globalThis to avoid webpack trying to resolve the 'buffer' module
const _Buffer: typeof globalThis.Buffer | undefined =
  typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined;

const CHUNK_SIZE = 8192;

function bytesToBinary(data: Uint8Array): string {
  let result = '';
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.subarray(i, Math.min(i + CHUNK_SIZE, data.length));
    result += String.fromCharCode(...chunk);
  }
  return result;
}

export function encodeBase64(data: Uint8Array): string {
  // Node.js path
  if (_Buffer) {
    return _Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString(
      'base64',
    );
  }
  // Browser path
  return btoa(bytesToBinary(data));
}

export function decodeBase64(input: string): Uint8Array {
  // Strip whitespace
  const cleaned = input.replace(/\s/g, '');
  // Node.js path
  if (_Buffer) {
    const buf = _Buffer.from(cleaned, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  // Browser path
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
