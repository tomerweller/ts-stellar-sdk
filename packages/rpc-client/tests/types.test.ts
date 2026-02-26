import { describe, it, expect } from 'vitest';
import {
  isSimulationError,
  isSimulationSuccess,
  isSimulationRestore,
  type SimulateTransactionSuccessResponse,
  type SimulateTransactionErrorResponse,
} from '../src/types.js';
import type { SorobanTransactionData } from '@stellar/xdr';

describe('simulation type guards', () => {
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

  const successResponse: SimulateTransactionSuccessResponse = {
    latestLedger: 100,
    minResourceFee: '50000',
    transactionData: sorobanData,
    results: [],
    events: [],
  };

  const errorResponse: SimulateTransactionErrorResponse = {
    error: 'something went wrong',
    latestLedger: 100,
  };

  describe('isSimulationError', () => {
    it('returns true for error responses', () => {
      expect(isSimulationError(errorResponse)).toBe(true);
    });

    it('returns false for success responses', () => {
      expect(isSimulationError(successResponse)).toBe(false);
    });
  });

  describe('isSimulationSuccess', () => {
    it('returns true for success responses', () => {
      expect(isSimulationSuccess(successResponse)).toBe(true);
    });

    it('returns false for error responses', () => {
      expect(isSimulationSuccess(errorResponse)).toBe(false);
    });
  });

  describe('isSimulationRestore', () => {
    it('returns false when no restorePreamble', () => {
      expect(isSimulationRestore(successResponse)).toBe(false);
    });

    it('returns true when restorePreamble present', () => {
      const withRestore: SimulateTransactionSuccessResponse = {
        ...successResponse,
        restorePreamble: {
          minResourceFee: '10000',
          transactionData: sorobanData,
        },
      };
      expect(isSimulationRestore(withRestore)).toBe(true);
    });
  });
});
