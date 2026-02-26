import type {
  DiagnosticEvent,
  LedgerCloseMeta,
  LedgerEntry,
  LedgerEntryData,
  LedgerHeader,
  LedgerHeaderHistoryEntry,
  LedgerKey,
  SCVal,
  SorobanAuthorizationEntry,
  SorobanTransactionData,
  TransactionEnvelope,
  TransactionMeta,
  TransactionResult,
} from '@stellar/xdr';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export type PaginatedByLedger<T = {}> = T & {
  startLedger: number;
  pagination?: { limit?: number };
};

export type PaginatedByCursor<T = {}> = T & {
  pagination: { cursor: string; limit?: number };
};

// ---------------------------------------------------------------------------
// getHealth
// ---------------------------------------------------------------------------

export interface GetHealthResponse {
  status: string;
  latestLedger: number;
  oldestLedger: number;
  ledgerRetentionWindow: number;
}

// ---------------------------------------------------------------------------
// getNetwork
// ---------------------------------------------------------------------------

export interface GetNetworkResponse {
  passphrase: string;
  protocolVersion: number;
  friendbotUrl?: string;
}

// ---------------------------------------------------------------------------
// getLatestLedger
// ---------------------------------------------------------------------------

export interface GetLatestLedgerResponse {
  id: string;
  sequence: number;
  closeTime: string;
  headerXdr: LedgerHeader;
  metadataXdr: LedgerCloseMeta;
}

// ---------------------------------------------------------------------------
// getVersionInfo
// ---------------------------------------------------------------------------

export interface GetVersionInfoResponse {
  version: string;
  commitHash: string;
  buildTimestamp: string;
  captiveCoreVersion: string;
  protocolVersion: number;
}

// ---------------------------------------------------------------------------
// getFeeStats
// ---------------------------------------------------------------------------

export interface FeeDistribution {
  max: string;
  min: string;
  mode: string;
  p10: string;
  p20: string;
  p30: string;
  p40: string;
  p50: string;
  p60: string;
  p70: string;
  p80: string;
  p90: string;
  p95: string;
  p99: string;
  transactionCount: string;
  ledgerCount: number;
}

export interface GetFeeStatsResponse {
  sorobanInclusionFee: FeeDistribution;
  inclusionFee: FeeDistribution;
  latestLedger: number;
}

// ---------------------------------------------------------------------------
// getLedgerEntries
// ---------------------------------------------------------------------------

export interface LedgerEntryResult {
  key: LedgerKey;
  val: LedgerEntryData;
  lastModifiedLedgerSeq: number;
  liveUntilLedgerSeq?: number;
}

export interface GetLedgerEntriesResponse {
  latestLedger: number;
  entries: LedgerEntryResult[];
}

// ---------------------------------------------------------------------------
// getTransaction
// ---------------------------------------------------------------------------

export type GetTransactionStatus = 'SUCCESS' | 'NOT_FOUND' | 'FAILED';

export interface GetTransactionResponse {
  status: GetTransactionStatus;
  latestLedger: number;
  latestLedgerCloseTime: number;
  oldestLedger: number;
  oldestLedgerCloseTime: number;
  // Present when status != NOT_FOUND:
  ledger?: number;
  createdAt?: number;
  applicationOrder?: number;
  feeBump?: boolean;
  envelopeXdr?: TransactionEnvelope;
  resultXdr?: TransactionResult;
  resultMetaXdr?: TransactionMeta;
  diagnosticEventsXdr?: DiagnosticEvent[];
  returnValue?: SCVal;
}

// ---------------------------------------------------------------------------
// getTransactions
// ---------------------------------------------------------------------------

export interface TransactionInfo {
  status: 'SUCCESS' | 'FAILED';
  txHash: string;
  ledger: number;
  createdAt: number;
  applicationOrder: number;
  feeBump: boolean;
  envelopeXdr: TransactionEnvelope;
  resultXdr: TransactionResult;
  resultMetaXdr: TransactionMeta;
  diagnosticEventsXdr?: DiagnosticEvent[];
}

export interface GetTransactionsResponse {
  transactions: TransactionInfo[];
  latestLedger: number;
  latestLedgerCloseTimestamp: number;
  oldestLedger: number;
  oldestLedgerCloseTimestamp: number;
  cursor: string;
}

// ---------------------------------------------------------------------------
// getLedgers
// ---------------------------------------------------------------------------

export interface LedgerInfo {
  hash: string;
  sequence: number;
  ledgerCloseTime: string;
  headerXdr: LedgerHeaderHistoryEntry;
  metadataXdr: LedgerCloseMeta;
}

export interface GetLedgersResponse {
  ledgers: LedgerInfo[];
  latestLedger: number;
  latestLedgerCloseTime: number;
  oldestLedger: number;
  oldestLedgerCloseTime: number;
  cursor: string;
}

// ---------------------------------------------------------------------------
// getEvents
// ---------------------------------------------------------------------------

export type EventType = 'contract' | 'system';

export interface EventFilter {
  type?: EventType;
  contractIds?: string[];
  topics?: string[][];
}

export interface EventInfo {
  type: EventType;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  id: string;
  txHash: string;
  topic: SCVal[];
  value: SCVal;
  inSuccessfulContractCall: boolean;
}

export interface GetEventsResponse {
  latestLedger: number;
  events: EventInfo[];
  cursor: string;
}

// ---------------------------------------------------------------------------
// sendTransaction
// ---------------------------------------------------------------------------

export type SendTransactionStatus = 'PENDING' | 'DUPLICATE' | 'TRY_AGAIN_LATER' | 'ERROR';

export interface SendTransactionResponse {
  hash: string;
  status: SendTransactionStatus;
  latestLedger: number;
  latestLedgerCloseTime: number;
  errorResultXdr?: TransactionResult;
  diagnosticEventsXdr?: DiagnosticEvent[];
}

// ---------------------------------------------------------------------------
// simulateTransaction
// ---------------------------------------------------------------------------

export type SimulationAuthMode = 'enforce' | 'record' | 'record_allow_nonroot';

export interface SimulationResult {
  retval: SCVal;
  auth: SorobanAuthorizationEntry[];
}

export interface SimulateTransactionSuccessResponse {
  latestLedger: number;
  minResourceFee: string;
  transactionData: SorobanTransactionData;
  results: SimulationResult[];
  events: DiagnosticEvent[];
  stateChanges?: {
    type: number;
    key: LedgerKey;
    before: LedgerEntry | null;
    after: LedgerEntry | null;
  }[];
  restorePreamble?: {
    minResourceFee: string;
    transactionData: SorobanTransactionData;
  };
}

export interface SimulateTransactionErrorResponse {
  error: string;
  latestLedger: number;
  events?: DiagnosticEvent[];
}

export type SimulateTransactionResponse =
  | SimulateTransactionSuccessResponse
  | SimulateTransactionErrorResponse;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isSimulationError(
  sim: SimulateTransactionResponse,
): sim is SimulateTransactionErrorResponse {
  return 'error' in sim;
}

export function isSimulationSuccess(
  sim: SimulateTransactionResponse,
): sim is SimulateTransactionSuccessResponse {
  return !('error' in sim);
}

export function isSimulationRestore(sim: SimulateTransactionSuccessResponse): boolean {
  return sim.restorePreamble !== undefined;
}
