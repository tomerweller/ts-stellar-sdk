import { describe, it, expect } from 'vitest';
import {
  type TransactionEnvelope,
  type SorobanTransactionData,
  type SorobanAuthorizationEntry,
  type SCVal,
  is,
} from '@stellar/xdr';
import { assembleTransaction } from '../src/assemble.js';
import { RpcError } from '../src/errors.js';
import type { SimulateTransactionSuccessResponse } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInvokeHostFunctionEnvelope(
  auth: SorobanAuthorizationEntry[] = [],
): TransactionEnvelope {
  return {
    Tx: {
      tx: {
        sourceAccount: { Ed25519: new Uint8Array(32) },
        fee: 100,
        seqNum: 1n,
        cond: 'None',
        memo: 'None',
        operations: [
          {
            sourceAccount: null,
            body: {
              InvokeHostFunction: {
                hostFunction: { InvokeContract: { contractAddress: { Contract: new Uint8Array(32) }, functionName: 'hello', args: [] } },
                auth,
              },
            },
          },
        ],
        ext: '0',
      },
      signatures: [],
    },
  };
}

function makeSimulationResponse(overrides: Partial<SimulateTransactionSuccessResponse> = {}): SimulateTransactionSuccessResponse {
  const sorobanData: SorobanTransactionData = {
    ext: '0',
    resources: {
      footprint: { readOnly: [], readWrite: [] },
      instructions: 100000,
      readBytes: 1000,
      writeBytes: 500,
    },
    resourceFee: 50000n,
  };

  return {
    latestLedger: 100,
    minResourceFee: '50000',
    transactionData: sorobanData,
    results: [{ retval: 'Void' as SCVal, auth: [] }],
    events: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('assembleTransaction', () => {
  it('updates fee and sets soroban transaction data', () => {
    const envelope = makeInvokeHostFunctionEnvelope();
    const sim = makeSimulationResponse();

    const result = assembleTransaction(envelope, sim);

    expect(is(result, 'Tx')).toBe(true);
    if (!is(result, 'Tx')) throw new Error('Expected Tx envelope');

    // Fee = original 100 + minResourceFee 50000
    expect(result.Tx.tx.fee).toBe(50100);

    // SorobanTransactionData is set in ext
    expect(is(result.Tx.tx.ext, '1')).toBe(true);
    if (is(result.Tx.tx.ext, '1')) {
      expect(result.Tx.tx.ext['1'].resourceFee).toBe(50000n);
    }

    // No signatures on the new envelope
    expect(result.Tx.signatures).toEqual([]);
  });

  it('applies auth from simulation when original has none', () => {
    const envelope = makeInvokeHostFunctionEnvelope([]);
    const mockAuth: SorobanAuthorizationEntry = {
      credentials: 'SourceAccount',
      rootInvocation: {
        function: { ContractFn: { contractAddress: { Contract: new Uint8Array(32) }, functionName: 'hello', args: [] } },
        subInvocations: [],
      },
    };
    const sim = makeSimulationResponse({
      results: [{ retval: 'Void' as SCVal, auth: [mockAuth] }],
    });

    const result = assembleTransaction(envelope, sim);

    if (!is(result, 'Tx')) throw new Error('Expected Tx envelope');
    const op = result.Tx.tx.operations[0]!;
    if (is(op.body, 'InvokeHostFunction')) {
      expect(op.body.InvokeHostFunction.auth).toHaveLength(1);
    }
  });

  it('preserves existing auth when original has auth entries', () => {
    const existingAuth: SorobanAuthorizationEntry = {
      credentials: 'SourceAccount',
      rootInvocation: {
        function: { ContractFn: { contractAddress: { Contract: new Uint8Array(32) }, functionName: 'existing', args: [] } },
        subInvocations: [],
      },
    };
    const envelope = makeInvokeHostFunctionEnvelope([existingAuth]);
    const sim = makeSimulationResponse({
      results: [{ retval: 'Void' as SCVal, auth: [existingAuth, existingAuth] }],
    });

    const result = assembleTransaction(envelope, sim);

    if (!is(result, 'Tx')) throw new Error('Expected Tx envelope');
    const op = result.Tx.tx.operations[0]!;
    if (is(op.body, 'InvokeHostFunction')) {
      // Original had 1 auth entry — should be preserved
      expect(op.body.InvokeHostFunction.auth).toHaveLength(1);
    }
  });

  it('preserves source account, sequence, memo, and cond', () => {
    const envelope = makeInvokeHostFunctionEnvelope();
    const sim = makeSimulationResponse();

    const result = assembleTransaction(envelope, sim);

    if (!is(result, 'Tx')) throw new Error('Expected Tx envelope');
    const origTx = (envelope as any).Tx.tx;
    const newTx = result.Tx.tx;
    expect(newTx.sourceAccount).toEqual(origTx.sourceAccount);
    expect(newTx.seqNum).toBe(origTx.seqNum);
    expect(newTx.memo).toBe(origTx.memo);
    expect(newTx.cond).toBe(origTx.cond);
  });

  it('rejects non-v1 envelopes', () => {
    const feeBumpEnvelope = {
      TxFeeBump: {
        tx: {
          feeSource: { Ed25519: new Uint8Array(32) },
          fee: 200n,
          innerTx: {
            Tx: {
              tx: {
                sourceAccount: { Ed25519: new Uint8Array(32) },
                fee: 100,
                seqNum: 1n,
                cond: 'None',
                memo: 'None',
                operations: [],
                ext: '0',
              },
              signatures: [],
            },
          },
          ext: '0',
        },
        signatures: [],
      },
    } as TransactionEnvelope;

    expect(() => assembleTransaction(feeBumpEnvelope, makeSimulationResponse())).toThrow(
      'v1 TransactionEnvelope',
    );
  });

  it('rejects transactions without exactly one Soroban operation', () => {
    const envelope: TransactionEnvelope = {
      Tx: {
        tx: {
          sourceAccount: { Ed25519: new Uint8Array(32) },
          fee: 100,
          seqNum: 1n,
          cond: 'None',
          memo: 'None',
          operations: [
            {
              sourceAccount: null,
              body: { Payment: { destination: { Ed25519: new Uint8Array(32) }, asset: 'Native', amount: 1000n } },
            },
          ],
          ext: '0',
        },
        signatures: [],
      },
    };

    expect(() => assembleTransaction(envelope, makeSimulationResponse())).toThrow(
      'exactly one Soroban operation',
    );
  });

  it('works with ExtendFootprintTtl operations', () => {
    const envelope: TransactionEnvelope = {
      Tx: {
        tx: {
          sourceAccount: { Ed25519: new Uint8Array(32) },
          fee: 100,
          seqNum: 1n,
          cond: 'None',
          memo: 'None',
          operations: [
            {
              sourceAccount: null,
              body: {
                ExtendFootprintTtl: { ext: '0', extendTo: 1000 },
              },
            },
          ],
          ext: '0',
        },
        signatures: [],
      },
    };

    const sim = makeSimulationResponse();
    const result = assembleTransaction(envelope, sim);
    expect(is(result, 'Tx')).toBe(true);
  });

  it('works with RestoreFootprint operations', () => {
    const envelope: TransactionEnvelope = {
      Tx: {
        tx: {
          sourceAccount: { Ed25519: new Uint8Array(32) },
          fee: 100,
          seqNum: 1n,
          cond: 'None',
          memo: 'None',
          operations: [
            {
              sourceAccount: null,
              body: {
                RestoreFootprint: { ext: '0' },
              },
            },
          ],
          ext: '0',
        },
        signatures: [],
      },
    };

    const sim = makeSimulationResponse();
    const result = assembleTransaction(envelope, sim);
    expect(is(result, 'Tx')).toBe(true);
  });
});
