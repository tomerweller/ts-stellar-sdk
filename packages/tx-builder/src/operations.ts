import type {
  Operation,
  OperationBody,
  Asset,
  ChangeTrustAsset,
  Price,
  Claimant,
  ClaimableBalanceID,
  LedgerKey,
  RevokeSponsorshipOp,
  HostFunction,
  SorobanAuthorizationEntry,
  SignerKey,
} from '@stellar/xdr';
import { parsePublicKey, parseMuxedAccount } from './helpers.js';

const encoder = new TextEncoder();

interface OperationOptions {
  source?: string;
}

const MAX_INT64 = 9223372036854775807n;

function buildOp(body: OperationBody, source?: string): Operation {
  return { sourceAccount: source ? parseMuxedAccount(source) : null, body };
}

// --- createAccount ---

export interface CreateAccountOptions extends OperationOptions {
  destination: string;
  startingBalance: bigint;
}

export function createAccount(opts: CreateAccountOptions): Operation {
  return buildOp(
    { CreateAccount: { destination: parsePublicKey(opts.destination), startingBalance: opts.startingBalance } },
    opts.source,
  );
}

// --- payment ---

export interface PaymentOptions extends OperationOptions {
  destination: string;
  asset: Asset;
  amount: bigint;
}

export function payment(opts: PaymentOptions): Operation {
  return buildOp(
    { Payment: { destination: parseMuxedAccount(opts.destination), asset: opts.asset, amount: opts.amount } },
    opts.source,
  );
}

// --- pathPaymentStrictReceive ---

export interface PathPaymentStrictReceiveOptions extends OperationOptions {
  sendAsset: Asset;
  sendMax: bigint;
  destination: string;
  destAsset: Asset;
  destAmount: bigint;
  path: Asset[];
}

export function pathPaymentStrictReceive(opts: PathPaymentStrictReceiveOptions): Operation {
  return buildOp(
    {
      PathPaymentStrictReceive: {
        sendAsset: opts.sendAsset,
        sendMax: opts.sendMax,
        destination: parseMuxedAccount(opts.destination),
        destAsset: opts.destAsset,
        destAmount: opts.destAmount,
        path: opts.path,
      },
    },
    opts.source,
  );
}

// --- pathPaymentStrictSend ---

export interface PathPaymentStrictSendOptions extends OperationOptions {
  sendAsset: Asset;
  sendAmount: bigint;
  destination: string;
  destAsset: Asset;
  destMin: bigint;
  path: Asset[];
}

export function pathPaymentStrictSend(opts: PathPaymentStrictSendOptions): Operation {
  return buildOp(
    {
      PathPaymentStrictSend: {
        sendAsset: opts.sendAsset,
        sendAmount: opts.sendAmount,
        destination: parseMuxedAccount(opts.destination),
        destAsset: opts.destAsset,
        destMin: opts.destMin,
        path: opts.path,
      },
    },
    opts.source,
  );
}

// --- manageSellOffer ---

export interface ManageSellOfferOptions extends OperationOptions {
  selling: Asset;
  buying: Asset;
  amount: bigint;
  price: Price;
  offerID?: bigint;
}

export function manageSellOffer(opts: ManageSellOfferOptions): Operation {
  return buildOp(
    {
      ManageSellOffer: {
        selling: opts.selling,
        buying: opts.buying,
        amount: opts.amount,
        price: opts.price,
        offerID: opts.offerID ?? 0n,
      },
    },
    opts.source,
  );
}

// --- manageBuyOffer ---

export interface ManageBuyOfferOptions extends OperationOptions {
  selling: Asset;
  buying: Asset;
  buyAmount: bigint;
  price: Price;
  offerID?: bigint;
}

export function manageBuyOffer(opts: ManageBuyOfferOptions): Operation {
  return buildOp(
    {
      ManageBuyOffer: {
        selling: opts.selling,
        buying: opts.buying,
        buyAmount: opts.buyAmount,
        price: opts.price,
        offerID: opts.offerID ?? 0n,
      },
    },
    opts.source,
  );
}

// --- createPassiveSellOffer ---

export interface CreatePassiveSellOfferOptions extends OperationOptions {
  selling: Asset;
  buying: Asset;
  amount: bigint;
  price: Price;
}

export function createPassiveSellOffer(opts: CreatePassiveSellOfferOptions): Operation {
  return buildOp(
    {
      CreatePassiveSellOffer: {
        selling: opts.selling,
        buying: opts.buying,
        amount: opts.amount,
        price: opts.price,
      },
    },
    opts.source,
  );
}

// --- setOptions ---

export interface SetOptionsOptions extends OperationOptions {
  inflationDest?: string;
  clearFlags?: number;
  setFlags?: number;
  masterWeight?: number;
  lowThreshold?: number;
  medThreshold?: number;
  highThreshold?: number;
  homeDomain?: string;
  signer?: { key: SignerKey; weight: number };
}

export function setOptions(opts: SetOptionsOptions): Operation {
  return buildOp(
    {
      SetOptions: {
        inflationDest: opts.inflationDest ? parsePublicKey(opts.inflationDest) : null,
        clearFlags: opts.clearFlags ?? null,
        setFlags: opts.setFlags ?? null,
        masterWeight: opts.masterWeight ?? null,
        lowThreshold: opts.lowThreshold ?? null,
        medThreshold: opts.medThreshold ?? null,
        highThreshold: opts.highThreshold ?? null,
        homeDomain: opts.homeDomain ?? null,
        signer: opts.signer ?? null,
      },
    },
    opts.source,
  );
}

// --- changeTrust ---

export interface ChangeTrustOptions extends OperationOptions {
  asset: ChangeTrustAsset;
  limit?: bigint;
}

export function changeTrust(opts: ChangeTrustOptions): Operation {
  return buildOp(
    {
      ChangeTrust: {
        line: opts.asset,
        limit: opts.limit ?? MAX_INT64,
      },
    },
    opts.source,
  );
}

// --- allowTrust ---

export interface AllowTrustOptions extends OperationOptions {
  trustor: string;
  assetCode: string;
  authorize: number;
}

export function allowTrust(opts: AllowTrustOptions): Operation {
  const codeBytes = encoder.encode(opts.assetCode);
  let asset: { readonly CreditAlphanum4: Uint8Array } | { readonly CreditAlphanum12: Uint8Array };
  if (codeBytes.length <= 4) {
    const padded = new Uint8Array(4);
    padded.set(codeBytes);
    asset = { CreditAlphanum4: padded };
  } else {
    const padded = new Uint8Array(12);
    padded.set(codeBytes);
    asset = { CreditAlphanum12: padded };
  }
  return buildOp(
    {
      AllowTrust: {
        trustor: parsePublicKey(opts.trustor),
        asset,
        authorize: opts.authorize,
      },
    },
    opts.source,
  );
}

// --- accountMerge ---

export interface AccountMergeOptions extends OperationOptions {
  destination: string;
}

export function accountMerge(opts: AccountMergeOptions): Operation {
  return buildOp(
    { AccountMerge: parseMuxedAccount(opts.destination) },
    opts.source,
  );
}

// --- inflation ---

export function inflation(opts?: OperationOptions): Operation {
  return buildOp('Inflation', opts?.source);
}

// --- manageData ---

export interface ManageDataOptions extends OperationOptions {
  name: string;
  value: Uint8Array | null;
}

export function manageData(opts: ManageDataOptions): Operation {
  return buildOp(
    {
      ManageData: {
        dataName: opts.name,
        dataValue: opts.value,
      },
    },
    opts.source,
  );
}

// --- bumpSequence ---

export interface BumpSequenceOptions extends OperationOptions {
  bumpTo: bigint;
}

export function bumpSequence(opts: BumpSequenceOptions): Operation {
  return buildOp(
    { BumpSequence: { bumpTo: opts.bumpTo } },
    opts.source,
  );
}

// --- createClaimableBalance ---

export interface CreateClaimableBalanceOptions extends OperationOptions {
  asset: Asset;
  amount: bigint;
  claimants: Claimant[];
}

export function createClaimableBalance(opts: CreateClaimableBalanceOptions): Operation {
  return buildOp(
    {
      CreateClaimableBalance: {
        asset: opts.asset,
        amount: opts.amount,
        claimants: opts.claimants,
      },
    },
    opts.source,
  );
}

// --- claimClaimableBalance ---

export interface ClaimClaimableBalanceOptions extends OperationOptions {
  balanceID: ClaimableBalanceID;
}

export function claimClaimableBalance(opts: ClaimClaimableBalanceOptions): Operation {
  return buildOp(
    { ClaimClaimableBalance: { balanceID: opts.balanceID } },
    opts.source,
  );
}

// --- beginSponsoringFutureReserves ---

export interface BeginSponsoringFutureReservesOptions extends OperationOptions {
  sponsoredID: string;
}

export function beginSponsoringFutureReserves(opts: BeginSponsoringFutureReservesOptions): Operation {
  return buildOp(
    { BeginSponsoringFutureReserves: { sponsoredID: parsePublicKey(opts.sponsoredID) } },
    opts.source,
  );
}

// --- endSponsoringFutureReserves ---

export function endSponsoringFutureReserves(opts?: OperationOptions): Operation {
  return buildOp('EndSponsoringFutureReserves', opts?.source);
}

// --- revokeSponsorship ---

export interface RevokeSponsorshipLedgerEntryOptions extends OperationOptions {
  ledgerKey: LedgerKey;
}

export interface RevokeSponsorshipSignerOptions extends OperationOptions {
  signer: { accountID: AccountID; signerKey: SignerKey };
}

import type { AccountID } from '@stellar/xdr';

export function revokeSponsorshipLedgerEntry(opts: RevokeSponsorshipLedgerEntryOptions): Operation {
  const revoke: RevokeSponsorshipOp = { LedgerEntry: opts.ledgerKey };
  return buildOp({ RevokeSponsorship: revoke }, opts.source);
}

export function revokeSponsorshipSigner(opts: RevokeSponsorshipSignerOptions): Operation {
  const revoke: RevokeSponsorshipOp = { Signer: opts.signer };
  return buildOp({ RevokeSponsorship: revoke }, opts.source);
}

// --- clawback ---

export interface ClawbackOptions extends OperationOptions {
  asset: Asset;
  from: string;
  amount: bigint;
}

export function clawback(opts: ClawbackOptions): Operation {
  return buildOp(
    {
      Clawback: {
        asset: opts.asset,
        from: parseMuxedAccount(opts.from),
        amount: opts.amount,
      },
    },
    opts.source,
  );
}

// --- clawbackClaimableBalance ---

export interface ClawbackClaimableBalanceOptions extends OperationOptions {
  balanceID: ClaimableBalanceID;
}

export function clawbackClaimableBalance(opts: ClawbackClaimableBalanceOptions): Operation {
  return buildOp(
    { ClawbackClaimableBalance: { balanceID: opts.balanceID } },
    opts.source,
  );
}

// --- setTrustLineFlags ---

export interface SetTrustLineFlagsOptions extends OperationOptions {
  trustor: string;
  asset: Asset;
  clearFlags: number;
  setFlags: number;
}

export function setTrustLineFlags(opts: SetTrustLineFlagsOptions): Operation {
  return buildOp(
    {
      SetTrustLineFlags: {
        trustor: parsePublicKey(opts.trustor),
        asset: opts.asset,
        clearFlags: opts.clearFlags,
        setFlags: opts.setFlags,
      },
    },
    opts.source,
  );
}

// --- liquidityPoolDeposit ---

export interface LiquidityPoolDepositOptions extends OperationOptions {
  liquidityPoolID: Uint8Array;
  maxAmountA: bigint;
  maxAmountB: bigint;
  minPrice: Price;
  maxPrice: Price;
}

export function liquidityPoolDeposit(opts: LiquidityPoolDepositOptions): Operation {
  return buildOp(
    {
      LiquidityPoolDeposit: {
        liquidityPoolID: opts.liquidityPoolID,
        maxAmountA: opts.maxAmountA,
        maxAmountB: opts.maxAmountB,
        minPrice: opts.minPrice,
        maxPrice: opts.maxPrice,
      },
    },
    opts.source,
  );
}

// --- liquidityPoolWithdraw ---

export interface LiquidityPoolWithdrawOptions extends OperationOptions {
  liquidityPoolID: Uint8Array;
  amount: bigint;
  minAmountA: bigint;
  minAmountB: bigint;
}

export function liquidityPoolWithdraw(opts: LiquidityPoolWithdrawOptions): Operation {
  return buildOp(
    {
      LiquidityPoolWithdraw: {
        liquidityPoolID: opts.liquidityPoolID,
        amount: opts.amount,
        minAmountA: opts.minAmountA,
        minAmountB: opts.minAmountB,
      },
    },
    opts.source,
  );
}

// --- invokeHostFunction ---

export interface InvokeHostFunctionOptions extends OperationOptions {
  hostFunction: HostFunction;
  auth: SorobanAuthorizationEntry[];
}

export function invokeHostFunction(opts: InvokeHostFunctionOptions): Operation {
  return buildOp(
    {
      InvokeHostFunction: {
        hostFunction: opts.hostFunction,
        auth: opts.auth,
      },
    },
    opts.source,
  );
}

// --- extendFootprintTtl ---

export interface ExtendFootprintTtlOptions extends OperationOptions {
  extendTo: number;
}

export function extendFootprintTtl(opts: ExtendFootprintTtlOptions): Operation {
  return buildOp(
    {
      ExtendFootprintTtl: {
        ext: '0',
        extendTo: opts.extendTo,
      },
    },
    opts.source,
  );
}

// --- restoreFootprint ---

export function restoreFootprint(opts?: OperationOptions): Operation {
  return buildOp(
    {
      RestoreFootprint: {
        ext: '0',
      },
    },
    opts?.source,
  );
}
