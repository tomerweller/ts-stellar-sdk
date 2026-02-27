export class StellarTomlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarTomlError';
  }
}

export class FederationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FederationError';
  }
}

export class AccountRequiresMemoError extends Error {
  readonly accountId: string;
  readonly operationIndex: number;

  constructor(message: string, accountId: string, operationIndex: number) {
    super(message);
    this.name = 'AccountRequiresMemoError';
    this.accountId = accountId;
    this.operationIndex = operationIndex;
  }
}
