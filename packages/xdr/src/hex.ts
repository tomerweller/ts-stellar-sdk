const HEX_TABLE: string[] = new Array(256);
for (let i = 0; i < 256; i++) {
  HEX_TABLE[i] = i.toString(16).padStart(2, '0');
}

export function bytesToHex(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += HEX_TABLE[bytes[i]!]!;
  }
  return result;
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
