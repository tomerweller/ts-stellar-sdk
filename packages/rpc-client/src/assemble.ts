import { is, type TransactionEnvelope, type Transaction, type Operation } from '@stellar/xdr';

import { RpcError } from './errors.js';
import type { SimulateTransactionSuccessResponse } from './types.js';

const SOROBAN_OPS = new Set(['InvokeHostFunction', 'ExtendFootprintTtl', 'RestoreFootprint']);

function isSorobanOp(op: Operation): boolean {
  const body = op.body;
  if (typeof body === 'string') return SOROBAN_OPS.has(body);
  for (const key of Object.keys(body)) {
    if (SOROBAN_OPS.has(key)) return true;
  }
  return false;
}

/**
 * Applies simulation results to a Soroban transaction, producing a new
 * unsigned `TransactionEnvelope` with updated fees, resource data, and
 * (for `InvokeHostFunction`) authorization entries.
 *
 * The returned envelope has an empty signature list because the underlying
 * transaction content has changed (any prior signatures would be invalid).
 */
export function assembleTransaction(
  envelope: TransactionEnvelope,
  simulation: SimulateTransactionSuccessResponse,
): TransactionEnvelope {
  if (!is(envelope, 'Tx')) {
    throw new RpcError(-1, 'assembleTransaction requires a v1 TransactionEnvelope (Tx)');
  }

  const origTx = envelope.Tx.tx;
  const ops = origTx.operations;

  if (ops.length !== 1 || !isSorobanOp(ops[0]!)) {
    throw new RpcError(-1, 'assembleTransaction requires exactly one Soroban operation');
  }

  const origOp = ops[0]!;
  const newFee = origTx.fee + parseInt(simulation.minResourceFee, 10);

  // Build the updated operation: for InvokeHostFunction, apply auth if the
  // original had none.
  let newBody = origOp.body;
  if (is(origOp.body, 'InvokeHostFunction')) {
    const ihf = origOp.body.InvokeHostFunction;
    if (ihf.auth.length === 0 && simulation.results[0]?.auth.length) {
      newBody = {
        InvokeHostFunction: {
          hostFunction: ihf.hostFunction,
          auth: simulation.results[0].auth,
        },
      };
    }
  }

  const newTx: Transaction = {
    sourceAccount: origTx.sourceAccount,
    fee: newFee,
    seqNum: origTx.seqNum,
    cond: origTx.cond,
    memo: origTx.memo,
    operations: [{ sourceAccount: origOp.sourceAccount, body: newBody }],
    ext: { '1': simulation.transactionData },
  };

  return { Tx: { tx: newTx, signatures: [] } };
}
