export function encodeBase64(data: Uint8Array): string {
  // Node.js path
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString(
      'base64',
    );
  }
  // Browser path
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!);
  }
  return btoa(binary);
}

export function decodeBase64(input: string): Uint8Array {
  // Strip whitespace
  const cleaned = input.replace(/\s/g, '');
  // Node.js path
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(cleaned, 'base64');
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
