import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseDotenv } from 'dotenv';
import { EnvExpansionError } from './errors.js';
import { cloneValue, isPlainObject, setAtPath } from './merge.js';

const ENV_REFERENCE = /(?<!\\)\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g;

export async function loadEnvVars(options: {
  cwd: string;
  env: string;
  enabled: boolean;
}): Promise<Record<string, string | undefined>> {
  const fileVars: Record<string, string> = {};

  if (options.enabled) {
    const files = [
      '.env',
      `.env.${options.env}`,
      '.env.local',
      `.env.${options.env}.local`,
    ];

    for (const file of files) {
      try {
        const source = await readFile(join(options.cwd, file), 'utf8');
        Object.assign(fileVars, parseDotenv(source));
      } catch (error) {
        if (!isMissingFile(error)) throw error;
      }
    }
  }

  // Real process env always wins over values read from .env files.
  return { ...fileVars, ...process.env };
}

export function applyEnvOverrides(options: {
  config: Record<string, unknown>;
  vars: Record<string, string | undefined>;
  prefix: string;
  separator: string;
}): Record<string, unknown> {
  const result = cloneValue(options.config);
  const prefix = options.prefix.endsWith('_')
    ? options.prefix
    : `${options.prefix}_`;

  for (const [key, rawValue] of Object.entries(options.vars)) {
    if (rawValue === undefined || !key.startsWith(prefix)) continue;

    const suffix = key.slice(prefix.length);
    if (!suffix) continue;

    const path = suffix
      .split(options.separator)
      .map((part) => part.toLowerCase())
      .filter(Boolean);

    if (path.length === 0) continue;
    setAtPath(result, path, parseEnvironmentValue(rawValue));
  }

  return result;
}

export function expandEnvironment(
  config: Record<string, unknown>,
  vars: Record<string, string | undefined>,
  options: {
    missing: 'throw' | 'ignore' | 'empty';
    file?: string;
  },
): Record<string, unknown> {
  return walk(config) as Record<string, unknown>;

  function walk(value: unknown, path: string[] = []): unknown {
    if (typeof value === 'string') {
      return expandString(value, vars, options, path);
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => walk(item, [...path, String(index)]));
    }

    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          walk(item, [...path, key]),
        ]),
      );
    }

    return value;
  }
}

function expandString(
  input: string,
  vars: Record<string, string | undefined>,
  options: { missing: 'throw' | 'ignore' | 'empty'; file?: string },
  path: string[],
): string {
  let current = input;

  for (let pass = 0; pass < 10; pass += 1) {
    let changed = false;
    current = current.replace(ENV_REFERENCE, (match, name: string, fallback?: string) => {
      const value = vars[name];
      if (value !== undefined) {
        changed = true;
        return value;
      }

      if (fallback !== undefined) {
        changed = true;
        return fallback;
      }

      if (options.missing === 'empty') {
        changed = true;
        return '';
      }

      if (options.missing === 'ignore') return match;

      const configPath = path.length > 0 ? path.join('.') : '(root)';
      throw new EnvExpansionError(
        `Missing environment variable "${name}" referenced by ${configPath}.`,
        options.file,
      );
    });

    if (!changed || !current.includes('${')) break;
  }

  return current.replace(/\\\$\{/g, '${');
}

function parseEnvironmentValue(rawValue: string): unknown {
  const value = rawValue.trim();

  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;

  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value)) {
    return Number(value);
  }

  if (
    (value.startsWith('{') && value.endsWith('}'))
    || (value.startsWith('[') && value.endsWith(']'))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return rawValue;
    }
  }

  return rawValue;
}


function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error
    && 'code' in error
    && (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
