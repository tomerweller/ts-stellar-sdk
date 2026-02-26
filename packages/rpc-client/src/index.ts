export { RpcClient, type RpcClientOptions, type PollOptions } from './client.js';
export { RpcError } from './errors.js';
export { assembleTransaction } from './assemble.js';
export {
  type GetHealthResponse,
  type GetNetworkResponse,
  type GetLatestLedgerResponse,
  type GetVersionInfoResponse,
  type GetFeeStatsResponse,
  type FeeDistribution,
  type GetLedgerEntriesResponse,
  type LedgerEntryResult,
  type GetTransactionResponse,
  type GetTransactionStatus,
  type GetTransactionsResponse,
  type TransactionInfo,
  type GetLedgersResponse,
  type LedgerInfo,
  type GetEventsResponse,
  type EventInfo,
  type EventType,
  type EventFilter,
  type SendTransactionResponse,
  type SendTransactionStatus,
  type SimulateTransactionResponse,
  type SimulateTransactionSuccessResponse,
  type SimulateTransactionErrorResponse,
  type SimulationAuthMode,
  type SimulationResult,
  type PaginatedByLedger,
  type PaginatedByCursor,
  isSimulationError,
  isSimulationSuccess,
  isSimulationRestore,
} from './types.js';

// Re-export @stellar/xdr for convenience
export * from '@stellar/xdr';
