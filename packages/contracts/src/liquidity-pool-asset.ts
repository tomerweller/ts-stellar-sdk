/**
 * LiquidityPoolAsset — represents a liquidity pool share asset.
 */

export interface AssetLike {
  readonly code: string;
  readonly issuer?: string;
  [key: string]: any;
}

function wrapAsset(asset: AssetLike): AssetLike {
  // If it already has getCode/getIssuer methods, return as-is
  if (typeof (asset as any).getCode === 'function') return asset;
  // Add accessor methods directly to the object (non-enumerable, preserves identity)
  Object.defineProperty(asset, 'getCode', {
    value: () => asset.code,
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(asset, 'getIssuer', {
    value: () => asset.issuer ?? '',
    enumerable: false,
    configurable: true,
  });
  return asset;
}

export class LiquidityPoolAsset {
  readonly assetA: AssetLike;
  readonly assetB: AssetLike;
  readonly fee: number;

  constructor(assetA: AssetLike, assetB: AssetLike, fee: number = 30) {
    // Validate lexicographic ordering
    const orderResult = compareAssets(assetA, assetB);
    if (orderResult >= 0) {
      throw new Error(
        'Assets must be in lexicographic order (assetA < assetB)',
      );
    }
    this.assetA = wrapAsset(assetA);
    this.assetB = wrapAsset(assetB);
    this.fee = fee;
  }

  getLiquidityPoolParameters(): {
    assetA: AssetLike;
    assetB: AssetLike;
    fee: number;
  } {
    return {
      assetA: this.assetA,
      assetB: this.assetB,
      fee: this.fee,
    };
  }

  getAssetType(): 'liquidity_pool_shares' {
    return 'liquidity_pool_shares';
  }

  toString(): string {
    const a = assetToString(this.assetA);
    const b = assetToString(this.assetB);
    return `liquidity_pool:${a}:${b}:${this.fee}`;
  }

  equals(other: LiquidityPoolAsset): boolean {
    return (
      assetEquals(this.assetA, other.assetA) &&
      assetEquals(this.assetB, other.assetB) &&
      this.fee === other.fee
    );
  }
}

function assetToString(a: AssetLike): string {
  if (!a.issuer && (a.code === 'XLM' || a.code === 'native')) return 'native';
  return `${a.code}:${a.issuer}`;
}

function getAssetTypeOrder(a: AssetLike): number {
  if (!a.issuer && (a.code === 'XLM' || a.code === 'native')) return 0;
  if (a.code.length <= 4) return 1;
  return 2;
}

function compareAssets(a: AssetLike, b: AssetLike): number {
  const typeA = getAssetTypeOrder(a);
  const typeB = getAssetTypeOrder(b);
  if (typeA !== typeB) return typeA - typeB;
  if (typeA === 0) return 0; // Both native

  if (a.code < b.code) return -1;
  if (a.code > b.code) return 1;

  const issA = a.issuer ?? '';
  const issB = b.issuer ?? '';
  if (issA < issB) return -1;
  if (issA > issB) return 1;
  return 0;
}

function assetEquals(a: AssetLike, b: AssetLike): boolean {
  return a.code === b.code && (a.issuer ?? '') === (b.issuer ?? '');
}
