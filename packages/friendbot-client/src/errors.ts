export class FriendbotError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = 'FriendbotError';
    this.status = status;
    this.detail = detail;
  }
}
