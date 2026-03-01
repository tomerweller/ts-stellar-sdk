import { httpGetJson, type TransportOptions } from './transport.js';
import { resolveStellarToml } from './sep1.js';
import { FederationError } from './errors.js';

export interface FederationRecord {
  account_id: string;
  stellar_address?: string;
  memo_type?: string;
  memo?: string;
}

export type FederationResolveOptions = TransportOptions;

export async function queryFederationServer(
  federationUrl: string,
  params: { type: string; q: string },
  opts?: FederationResolveOptions,
): Promise<FederationRecord> {
  const url = new URL(federationUrl);
  url.searchParams.set('type', params.type);
  url.searchParams.set('q', params.q);

  let result: unknown;
  try {
    result = await httpGetJson<unknown>(url.toString(), opts);
  } catch (err) {
    throw new FederationError(
      `Federation request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (
    typeof result !== 'object' ||
    result === null ||
    typeof (result as FederationRecord).account_id !== 'string'
  ) {
    throw new FederationError(
      'Federation response missing account_id field',
    );
  }

  const record = result as FederationRecord;

  if (record.memo !== undefined && typeof record.memo !== 'string') {
    throw new FederationError('Federation response memo must be a string');
  }

  return record;
}

export async function resolveFederationAddress(
  address: string,
  opts?: FederationResolveOptions,
): Promise<FederationRecord> {
  // If it looks like a G-address, return immediately
  if (address.length === 56 && address.startsWith('G')) {
    return { account_id: address };
  }

  const parts = address.split('*');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new FederationError(
      `Invalid federation address: ${address}. Expected format: name*domain`,
    );
  }

  const domain = parts[1];

  let toml: Record<string, unknown>;
  try {
    toml = await resolveStellarToml(domain, opts);
  } catch (err) {
    throw new FederationError(
      `Failed to resolve stellar.toml for ${domain}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const federationServer = toml['FEDERATION_SERVER'];
  if (typeof federationServer !== 'string') {
    throw new FederationError(
      `stellar.toml for ${domain} does not contain FEDERATION_SERVER`,
    );
  }

  return queryFederationServer(
    federationServer,
    { type: 'name', q: address },
    opts,
  );
}
