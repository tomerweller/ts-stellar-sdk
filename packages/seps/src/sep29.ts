import { AccountRequiresMemoError } from './errors.js';

export interface MemoRequiredOperation {
  type: string;
  destination?: string;
}

export type AccountDataLoader = (
  accountId: string,
) => Promise<Record<string, string> | null>;

const MEMO_REQUIRED_OPERATIONS = new Set([
  'payment',
  'pathPaymentStrictReceive',
  'pathPaymentStrictSend',
  'accountMerge',
]);

// "MQ==" is base64 for the single byte "1"
const MEMO_REQUIRED_VALUE = 'MQ==';

export async function checkMemoRequired(
  memoType: string,
  operations: readonly MemoRequiredOperation[],
  loadAccountData: AccountDataLoader,
): Promise<void> {
  if (memoType !== 'none') {
    return;
  }

  const checked = new Set<string>();

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]!;

    if (!MEMO_REQUIRED_OPERATIONS.has(op.type)) {
      continue;
    }

    const dest = op.destination;
    if (!dest) {
      continue;
    }

    // Skip M-addresses (muxed accounts)
    if (dest.startsWith('M')) {
      continue;
    }

    if (checked.has(dest)) {
      continue;
    }
    checked.add(dest);

    const data = await loadAccountData(dest);
    if (data === null) {
      continue;
    }

    if (data['config.memo_required'] === MEMO_REQUIRED_VALUE) {
      throw new AccountRequiresMemoError(
        `account ${dest} requires a memo in the transaction`,
        dest,
        i,
      );
    }
  }
}
