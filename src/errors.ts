export const XdrErrorCode = {
  InvalidValue: 'INVALID_VALUE',
  LengthExceedsMax: 'LENGTH_EXCEEDS_MAX',
  LengthMismatch: 'LENGTH_MISMATCH',
  NonZeroPadding: 'NON_ZERO_PADDING',
  BufferUnderflow: 'BUFFER_UNDERFLOW',
  BufferNotFullyConsumed: 'BUFFER_NOT_FULLY_CONSUMED',
  DepthLimitExceeded: 'DEPTH_LIMIT_EXCEEDED',
  ByteLimitExceeded: 'BYTE_LIMIT_EXCEEDED',
  InvalidEnumValue: 'INVALID_ENUM_VALUE',
  InvalidUnionDiscriminant: 'INVALID_UNION_DISCRIMINANT',
  Utf8Error: 'UTF8_ERROR',
} as const;

export type XdrErrorCode = (typeof XdrErrorCode)[keyof typeof XdrErrorCode];

export class XdrError extends Error {
  readonly code: XdrErrorCode;
  constructor(code: XdrErrorCode, message?: string) {
    super(message ? `${code}: ${message}` : code);
    this.name = 'XdrError';
    this.code = code;
  }
}
