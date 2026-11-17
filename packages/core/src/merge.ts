export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    ) as T;
  }

  return value;
}

export function deepMerge(
  base: unknown,
  override: unknown,
  options: { mergeArrays?: boolean } = {},
): unknown {
  if (override === undefined) return cloneValue(base);

  if (isPlainObject(base) && isPlainObject(override)) {
    const result: Record<string, unknown> = cloneValue(base);
    for (const [key, value] of Object.entries(override)) {
      result[key] = key in result
        ? deepMerge(result[key], value, options)
        : cloneValue(value);
    }
    return result;
  }

  if (options.mergeArrays && Array.isArray(base) && Array.isArray(override)) {
    return [...cloneValue(base), ...cloneValue(override)];
  }

  return cloneValue(override);
}

export function mergeConfigs(
  layers: unknown[],
  options: { mergeArrays?: boolean } = {},
): Record<string, unknown> {
  let result: Record<string, unknown> = {};
  for (const layer of layers) {
    if (layer === undefined) continue;
    if (!isPlainObject(layer)) {
      throw new TypeError(
        `Configuration layers must be plain objects, received ${describeValue(layer)}.`,
      );
    }
    result = deepMerge(result, layer, options) as Record<string, unknown>;
  }
  return result;
}

export function getAtPath(value: unknown, path: string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (!isPlainObject(current) && !Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function setAtPath(
  target: Record<string, unknown>,
  path: string[],
  value: unknown,
): void {
  if (path.length === 0) return;

  let current = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = resolveKey(current, path[index]!);
    const existing = current[segment];
    if (!isPlainObject(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[resolveKey(current, path[path.length - 1]!)] = value;
}

function resolveKey(
  object: Record<string, unknown>,
  requestedKey: string,
): string {
  if (requestedKey in object) return requestedKey;

  const lowerRequested = requestedKey.toLowerCase();
  const matches = Object.keys(object).filter(
    (key) => key.toLowerCase() === lowerRequested,
  );
  return matches.length === 1 ? matches[0]! : requestedKey;
}

function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value;
}
