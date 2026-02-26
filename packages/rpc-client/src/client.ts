import {
  type AccountEntry,
  type LedgerKey,
  type SCVal,
  type TransactionEnvelope,
  LedgerKey as LedgerKeyCodec,
  TransactionEnvelope as TransactionEnvelopeCodec,
  is,
  decodeStrkey,
  type ContractDataDurability,
} from '@stellar/xdr';

import { RpcError } from './errors.js';
import { jsonRpcPost } from './transport.js';
import { assembleTransaction } from './assemble.js';
import {
  parseGetTransactionResponse,
  parseGetTransactionsResponse,
  parseGetLedgerEntriesResponse,
  parseGetEventsResponse,
  parseSendTransactionResponse,
  parseSimulateTransactionResponse,
  parseGetLedgersResponse,
  parseGetLatestLedgerResponse,
} from './parsers.js';
import {
  isSimulationError,
  type EventFilter,
  type GetHealthResponse,
  type GetNetworkResponse,
  type GetLatestLedgerResponse,
  type GetVersionInfoResponse,
  type GetFeeStatsResponse,
  type GetLedgerEntriesResponse,
  type GetTransactionResponse,
  type GetTransactionsResponse,
  type GetLedgersResponse,
  type GetEventsResponse,
  type SendTransactionResponse,
  type SimulateTransactionResponse,
  type SimulationAuthMode,
  type LedgerEntryResult,
  type PaginatedByLedger,
  type PaginatedByCursor,
} from './types.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface RpcClientOptions {
  allowHttp?: boolean;
  headers?: Record<string, string>;
}

export interface PollOptions {
  attempts?: number;
  sleepStrategy?: (attempt: number) => number;
}

// ---------------------------------------------------------------------------
// RpcClient
// ---------------------------------------------------------------------------

export class RpcClient {
  readonly url: string;
  private readonly headers: Record<string, string>;

  constructor(url: string, opts?: RpcClientOptions) {
    if (!opts?.allowHttp && url.startsWith('http://')) {
      throw new RpcError(-1, 'HTTP URLs are not allowed by default. Pass allowHttp: true to enable.');
    }
    this.url = url;
    this.headers = opts?.headers ?? {};
  }

  private rpc<T>(method: string, params: object = {}): Promise<T> {
    return jsonRpcPost<T>(this.url, method, params, this.headers);
  }

  // -----------------------------------------------------------------------
  // Core RPC methods (12)
  // -----------------------------------------------------------------------

  async getHealth(): Promise<GetHealthResponse> {
    return this.rpc('getHealth');
  }

  async getNetwork(): Promise<GetNetworkResponse> {
    return this.rpc('getNetwork');
  }

  async getLatestLedger(): Promise<GetLatestLedgerResponse> {
    const raw = await this.rpc<any>('getLatestLedger');
    return parseGetLatestLedgerResponse(raw);
  }

  async getVersionInfo(): Promise<GetVersionInfoResponse> {
    return this.rpc('getVersionInfo');
  }

  async getFeeStats(): Promise<GetFeeStatsResponse> {
    return this.rpc('getFeeStats');
  }

  async getLedgerEntries(keys: LedgerKey[]): Promise<GetLedgerEntriesResponse> {
    const raw = await this.rpc<any>('getLedgerEntries', {
      keys: keys.map((k) => LedgerKeyCodec.toBase64(k)),
    });
    return parseGetLedgerEntriesResponse(raw);
  }

  async getTransaction(hash: string): Promise<GetTransactionResponse> {
    const raw = await this.rpc<any>('getTransaction', { hash });
    return parseGetTransactionResponse(raw);
  }

  async getTransactions(
    req: PaginatedByLedger | PaginatedByCursor,
  ): Promise<GetTransactionsResponse> {
    const raw = await this.rpc<any>('getTransactions', req);
    return parseGetTransactionsResponse(raw);
  }

  async getLedgers(
    req: PaginatedByLedger | PaginatedByCursor,
  ): Promise<GetLedgersResponse> {
    const raw = await this.rpc<any>('getLedgers', req);
    return parseGetLedgersResponse(raw);
  }

  async getEvents(
    req: PaginatedByLedger<EventsParams> | PaginatedByCursor<EventsParams>,
  ): Promise<GetEventsResponse> {
    const raw = await this.rpc<any>('getEvents', req);
    return parseGetEventsResponse(raw);
  }

  async sendTransaction(envelope: TransactionEnvelope): Promise<SendTransactionResponse> {
    const raw = await this.rpc<any>('sendTransaction', {
      transaction: TransactionEnvelopeCodec.toBase64(envelope),
    });
    return parseSendTransactionResponse(raw);
  }

  async simulateTransaction(
    envelope: TransactionEnvelope,
    opts?: { resourceLeeway?: number; authMode?: SimulationAuthMode },
  ): Promise<SimulateTransactionResponse> {
    const params: Record<string, unknown> = {
      transaction: TransactionEnvelopeCodec.toBase64(envelope),
    };
    if (opts?.resourceLeeway !== undefined) {
      params.resourceConfig = { instructionLeeway: opts.resourceLeeway };
    }
    if (opts?.authMode !== undefined) {
      params.simulationAuthMode = opts.authMode;
    }
    const raw = await this.rpc<any>('simulateTransaction', params);
    return parseSimulateTransactionResponse(raw);
  }

  // -----------------------------------------------------------------------
  // Convenience methods
  // -----------------------------------------------------------------------

  async getAccount(address: string): Promise<AccountEntry> {
    const { payload } = decodeStrkey(address);
    const key: LedgerKey = { Account: { accountID: { PublicKeyTypeEd25519: payload } } };
    const resp = await this.getLedgerEntries([key]);
    const entry = resp.entries[0];
    if (!entry || !is(entry.val, 'Account')) {
      throw new RpcError(-1, `Account not found: ${address}`);
    }
    return entry.val.Account;
  }

  async getContractData(
    contractId: string,
    key: SCVal,
    durability: 'temporary' | 'persistent' = 'persistent',
  ): Promise<LedgerEntryResult | null> {
    const { payload } = decodeStrkey(contractId);
    const dur: ContractDataDurability = durability === 'temporary' ? 'Temporary' : 'Persistent';
    const ledgerKey: LedgerKey = {
      ContractData: { contract: { Contract: payload }, key, durability: dur },
    };
    const resp = await this.getLedgerEntries([ledgerKey]);
    return resp.entries[0] ?? null;
  }

  async pollTransaction(
    hash: string,
    opts?: PollOptions,
  ): Promise<GetTransactionResponse> {
    const attempts = opts?.attempts ?? 30;
    const sleepStrategy = opts?.sleepStrategy ?? (() => 1000);

    for (let i = 0; i < attempts; i++) {
      const resp = await this.getTransaction(hash);
      if (resp.status !== 'NOT_FOUND') return resp;
      if (i < attempts - 1) {
        await sleep(sleepStrategy(i));
      }
    }

    throw new RpcError(-1, `Transaction ${hash} not found after ${attempts} attempts`);
  }

  async prepareTransaction(envelope: TransactionEnvelope): Promise<TransactionEnvelope> {
    const sim = await this.simulateTransaction(envelope);
    if (isSimulationError(sim)) {
      throw new RpcError(-1, `Simulation failed: ${sim.error}`);
    }
    return assembleTransaction(envelope, sim);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface EventsParams {
  filters?: EventFilter[];
  endLedger?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
