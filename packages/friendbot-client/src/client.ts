import { FriendbotError } from './errors.js';

export interface FriendbotClientOptions {
  allowHttp?: boolean;
}

export interface FriendbotResponse {
  hash: string;
}

export class FriendbotClient {
  readonly url: string;

  constructor(url: string, opts?: FriendbotClientOptions) {
    if (!opts?.allowHttp && url.startsWith('http://')) {
      throw new FriendbotError(0, 'HTTP URLs are not allowed by default. Pass allowHttp: true to enable.');
    }
    this.url = url;
  }

  async fund(address: string): Promise<FriendbotResponse> {
    const resp = await fetch(`${this.url}?addr=${address}`);

    if (!resp.ok) {
      let detail: string | undefined;
      try {
        const body = await resp.json();
        detail = body?.detail ?? body?.message ?? JSON.stringify(body);
      } catch {
        // body wasn't JSON — leave detail undefined
      }
      throw new FriendbotError(
        resp.status,
        `Friendbot request failed with status ${resp.status}`,
        detail,
      );
    }

    const body = await resp.json();
    return { hash: body.hash };
  }

  static async fund(
    address: string,
    url: string,
    opts?: FriendbotClientOptions,
  ): Promise<FriendbotResponse> {
    const client = new FriendbotClient(url, opts);
    return client.fund(address);
  }
}
