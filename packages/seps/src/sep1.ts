import { parse } from 'smol-toml';
import { httpGetText, type TransportOptions } from './transport.js';
import { StellarTomlError } from './errors.js';

export type StellarTomlResolveOptions = TransportOptions;

export async function resolveStellarToml(
  domain: string,
  opts?: StellarTomlResolveOptions,
): Promise<Record<string, unknown>> {
  const protocol = opts?.allowHttp ? 'http' : 'https';
  const url = `${protocol}://${domain}/.well-known/stellar.toml`;

  let text: string;
  try {
    text = await httpGetText(url, opts);
  } catch (err) {
    throw new StellarTomlError(
      `Failed to fetch stellar.toml from ${domain}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    return parse(text) as Record<string, unknown>;
  } catch (err) {
    throw new StellarTomlError(
      `Failed to parse stellar.toml from ${domain}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
