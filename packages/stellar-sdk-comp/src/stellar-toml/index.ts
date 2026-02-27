/**
 * StellarToml — compat wrapper matching js-stellar-sdk's StellarTomlResolver.
 */

import {
  resolveStellarToml,
  StellarTomlError,
  type StellarTomlResolveOptions,
} from '@stellar/seps';

export { StellarTomlError };

export namespace Api {
  export interface StellarTomlResolveOptions {
    allowHttp?: boolean;
    timeout?: number;
  }

  export interface StellarToml extends Record<string, unknown> {
    FEDERATION_SERVER?: string;
    AUTH_SERVER?: string;
    TRANSFER_SERVER?: string;
    TRANSFER_SERVER_SEP0024?: string;
    KYC_SERVER?: string;
    WEB_AUTH_ENDPOINT?: string;
    SIGNING_KEY?: string;
    HORIZON_URL?: string;
    ACCOUNTS?: string[];
    VERSION?: string;
    NETWORK_PASSPHRASE?: string;
    DOCUMENTATION?: Documentation;
    CURRENCIES?: Currency[];
  }

  export interface Documentation {
    ORG_NAME?: string;
    ORG_DBA?: string;
    ORG_URL?: string;
    ORG_LOGO?: string;
    ORG_DESCRIPTION?: string;
    ORG_PHYSICAL_ADDRESS?: string;
    ORG_PHYSICAL_ADDRESS_ATTESTATION?: string;
    ORG_PHONE_NUMBER?: string;
    ORG_PHONE_NUMBER_ATTESTATION?: string;
    ORG_KEYBASE?: string;
    ORG_TWITTER?: string;
    ORG_GITHUB?: string;
    ORG_OFFICIAL_EMAIL?: string;
    ORG_SUPPORT_EMAIL?: string;
    ORG_LICENSING_AUTHORITY?: string;
    ORG_LICENSE_TYPE?: string;
    ORG_LICENSE_NUMBER?: string;
  }

  export interface Currency {
    code?: string;
    code_template?: string;
    issuer?: string;
    status?: string;
    display_decimals?: number;
    name?: string;
    desc?: string;
    conditions?: string;
    image?: string;
    fixed_number?: number;
    max_number?: number;
    is_unlimited?: boolean;
    is_asset_anchored?: boolean;
    anchor_asset_type?: string;
    anchor_asset?: string;
    attestation_of_reserve?: string;
    redemption_instructions?: string;
  }
}

export class Resolver {
  static async resolve(
    domain: string,
    opts?: Api.StellarTomlResolveOptions,
  ): Promise<Api.StellarToml> {
    const resolveOpts: StellarTomlResolveOptions = {
      allowHttp: opts?.allowHttp,
      timeout: opts?.timeout,
    };
    return resolveStellarToml(domain, resolveOpts) as Promise<Api.StellarToml>;
  }
}
