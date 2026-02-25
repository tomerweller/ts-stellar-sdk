import { BaseCodec, type XdrCodec } from './codec.js';
import { XdrError, XdrErrorCode } from './errors.js';
import { XdrReader } from './reader.js';
import { XdrWriter } from './writer.js';

// ---- xdrStruct ----

export function xdrStruct<T>(
  fields: ReadonlyArray<readonly [string, XdrCodec<any>]>,
): XdrCodec<T> {
  return new (class extends BaseCodec<T> {
    encode(writer: XdrWriter, value: T): void {
      writer.limits.withDepth(() => {
        for (const [name, codec] of fields) {
          codec.encode(writer, (value as any)[name]);
        }
      });
    }
    decode(reader: XdrReader): T {
      return reader.limits.withDepth(() => {
        const result: Record<string, unknown> = {};
        for (const [name, codec] of fields) {
          result[name] = codec.decode(reader);
        }
        return result as T;
      });
    }
  })();
}

// ---- xdrEnum ----

export function xdrEnum<D extends Record<string, number>>(
  members: D,
): XdrCodec<keyof D & string> & Readonly<D> {
  const reverseMap = new Map<number, string>();
  for (const [name, value] of Object.entries(members)) {
    reverseMap.set(value, name);
  }

  const codec = new (class extends BaseCodec<keyof D & string> {
    encode(writer: XdrWriter, value: keyof D & string): void {
      const numericValue = members[value];
      if (numericValue === undefined) {
        throw new XdrError(
          XdrErrorCode.InvalidEnumValue,
          `Unknown enum member: ${String(value)}`,
        );
      }
      writer.writeInt32(numericValue);
    }
    decode(reader: XdrReader): keyof D & string {
      const raw = reader.readInt32();
      const name = reverseMap.get(raw);
      if (name === undefined) {
        throw new XdrError(
          XdrErrorCode.InvalidEnumValue,
          `Unknown enum value: ${raw}`,
        );
      }
      return name as keyof D & string;
    }
  })();

  // Copy enum member properties onto the codec object
  return Object.assign(codec, members) as XdrCodec<keyof D & string> &
    Readonly<D>;
}

// ---- taggedUnion ----

interface UnionArm {
  tags: readonly (string | number)[];
  codec?: XdrCodec<any>;
}

interface TaggedUnionConfig {
  switchOn: XdrCodec<any>;
  arms: ReadonlyArray<UnionArm>;
  defaultArm?: { codec?: XdrCodec<any> };
}

// ---- lazy ----

export function lazy<T>(factory: () => XdrCodec<T>): XdrCodec<T> {
  let cached: XdrCodec<T> | undefined;
  const get = () => (cached ??= factory());
  return new (class extends BaseCodec<T> {
    encode(writer: XdrWriter, value: T): void {
      get().encode(writer, value);
    }
    decode(reader: XdrReader): T {
      return get().decode(reader);
    }
  })();
}

// ---- taggedUnion ----

export function taggedUnion(config: TaggedUnionConfig): XdrCodec<any> {
  // Build a lookup from tag → arm codec (undefined means void arm)
  const armMap = new Map<string | number, XdrCodec<any> | undefined>();
  for (const arm of config.arms) {
    for (const tag of arm.tags) {
      armMap.set(tag, arm.codec);
    }
  }

  return new (class extends BaseCodec<any> {
    encode(writer: XdrWriter, value: any): void {
      writer.limits.withDepth(() => {
        const tag = value.tag;
        config.switchOn.encode(writer, tag);
        let armCodec = armMap.get(tag);
        if (armCodec === undefined && !armMap.has(tag)) {
          // Not in explicit arms, try default
          if (config.defaultArm === undefined) {
            throw new XdrError(
              XdrErrorCode.InvalidUnionDiscriminant,
              `Unknown union discriminant: ${String(tag)}`,
            );
          }
          armCodec = config.defaultArm.codec;
        }
        if (armCodec !== undefined) {
          armCodec.encode(writer, value.value);
        }
      });
    }
    decode(reader: XdrReader): any {
      return reader.limits.withDepth(() => {
        const tag = config.switchOn.decode(reader);
        let armCodec = armMap.get(tag);
        if (armCodec === undefined && !armMap.has(tag)) {
          // Not in explicit arms, try default
          if (config.defaultArm === undefined) {
            throw new XdrError(
              XdrErrorCode.InvalidUnionDiscriminant,
              `Unknown union discriminant: ${String(tag)}`,
            );
          }
          armCodec = config.defaultArm.codec;
        }
        if (armCodec !== undefined) {
          return { tag, value: armCodec.decode(reader) };
        }
        return { tag };
      });
    }
  })();
}
