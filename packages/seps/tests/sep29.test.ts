import { describe, it, expect, vi } from 'vitest';
import { checkMemoRequired } from '../src/sep29.js';
import { AccountRequiresMemoError } from '../src/errors.js';
import type { MemoRequiredOperation, AccountDataLoader } from '../src/sep29.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLoader(
  accounts: Record<string, Record<string, string>>,
): AccountDataLoader {
  return async (accountId: string) => {
    return accounts[accountId] ?? null;
  };
}

const DEST_A = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';
const DEST_B = 'GBCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW';
const MUXED = 'MABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH';

// ---------------------------------------------------------------------------
// checkMemoRequired
// ---------------------------------------------------------------------------

describe('checkMemoRequired', () => {
  it('skips check when memo is present (text)', async () => {
    const loader = vi.fn();

    await checkMemoRequired('text', [
      { type: 'payment', destination: DEST_A },
    ], loader);

    expect(loader).not.toHaveBeenCalled();
  });

  it('skips check when memo is present (id)', async () => {
    const loader = vi.fn();

    await checkMemoRequired('id', [
      { type: 'payment', destination: DEST_A },
    ], loader);

    expect(loader).not.toHaveBeenCalled();
  });

  it('skips check when memo is present (hash)', async () => {
    const loader = vi.fn();

    await checkMemoRequired('hash', [
      { type: 'payment', destination: DEST_A },
    ], loader);

    expect(loader).not.toHaveBeenCalled();
  });

  it('skips check when memo is present (return)', async () => {
    const loader = vi.fn();

    await checkMemoRequired('return', [
      { type: 'payment', destination: DEST_A },
    ], loader);

    expect(loader).not.toHaveBeenCalled();
  });

  it('throws AccountRequiresMemoError when destination requires memo', async () => {
    const loader = makeLoader({
      [DEST_A]: { 'config.memo_required': 'MQ==' },
    });

    const ops: MemoRequiredOperation[] = [
      { type: 'payment', destination: DEST_A },
    ];

    await expect(checkMemoRequired('none', ops, loader)).rejects.toThrow(
      AccountRequiresMemoError,
    );

    try {
      await checkMemoRequired('none', ops, loader);
    } catch (e) {
      const err = e as AccountRequiresMemoError;
      expect(err.accountId).toBe(DEST_A);
      expect(err.operationIndex).toBe(0);
      expect(err.message).toContain(DEST_A);
    }
  });

  it('checks all relevant operation types', async () => {
    const loader = makeLoader({
      [DEST_A]: { 'config.memo_required': 'MQ==' },
    });

    for (const opType of ['payment', 'pathPaymentStrictReceive', 'pathPaymentStrictSend', 'accountMerge']) {
      await expect(
        checkMemoRequired('none', [{ type: opType, destination: DEST_A }], loader),
      ).rejects.toThrow(AccountRequiresMemoError);
    }
  });

  it('ignores non-relevant operation types', async () => {
    const loader = makeLoader({
      [DEST_A]: { 'config.memo_required': 'MQ==' },
    });

    await checkMemoRequired('none', [
      { type: 'createAccount', destination: DEST_A },
      { type: 'changeTrust' },
      { type: 'manageData' },
    ], loader);
  });

  it('skips M-addresses (muxed accounts)', async () => {
    const loader = vi.fn();

    await checkMemoRequired('none', [
      { type: 'payment', destination: MUXED },
    ], loader);

    expect(loader).not.toHaveBeenCalled();
  });

  it('skips unfunded accounts (loader returns null)', async () => {
    const loader = makeLoader({});

    await checkMemoRequired('none', [
      { type: 'payment', destination: DEST_A },
    ], loader);
  });

  it('does not throw when config.memo_required is absent', async () => {
    const loader = makeLoader({
      [DEST_A]: { some_other_key: 'value' },
    });

    await checkMemoRequired('none', [
      { type: 'payment', destination: DEST_A },
    ], loader);
  });

  it('does not throw when config.memo_required is not MQ==', async () => {
    const loader = makeLoader({
      [DEST_A]: { 'config.memo_required': 'MA==' },
    });

    await checkMemoRequired('none', [
      { type: 'payment', destination: DEST_A },
    ], loader);
  });

  it('reports correct operationIndex for second operation', async () => {
    const loader = makeLoader({
      [DEST_B]: { 'config.memo_required': 'MQ==' },
    });

    const ops: MemoRequiredOperation[] = [
      { type: 'changeTrust' },
      { type: 'payment', destination: DEST_B },
    ];

    try {
      await checkMemoRequired('none', ops, loader);
      expect.fail('Should have thrown');
    } catch (e) {
      const err = e as AccountRequiresMemoError;
      expect(err.operationIndex).toBe(1);
      expect(err.accountId).toBe(DEST_B);
    }
  });

  it('only loads each destination once', async () => {
    const loader = vi.fn().mockResolvedValue({});

    await checkMemoRequired('none', [
      { type: 'payment', destination: DEST_A },
      { type: 'payment', destination: DEST_A },
      { type: 'payment', destination: DEST_A },
    ], loader);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('handles operations without destination', async () => {
    const loader = vi.fn();

    await checkMemoRequired('none', [
      { type: 'payment' },
    ], loader);

    expect(loader).not.toHaveBeenCalled();
  });
});
