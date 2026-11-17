import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { ConfigParseError } from './errors.js';
import type {
  ConfigContext,
  ConfigParserContext,
  ZooconfigPlugin,
} from './types.js';

export type ParserRegistry = {
  extensions: string[];
  get(extension: string): ZooconfigPlugin | undefined;
};

const jsonPlugin: ZooconfigPlugin = {
  name: 'json',
  extensions: ['.json'],
  parse(source) {
    return JSON.parse(source);
  },
};

export function createParserRegistry(
  plugins: ZooconfigPlugin[] = [],
): ParserRegistry {
  const parsers = new Map<string, ZooconfigPlugin>();

  for (const plugin of [jsonPlugin, ...plugins]) {
    validatePlugin(plugin);
    for (const extension of plugin.extensions) {
      const normalized = normalizeExtension(extension);
      const existing = parsers.get(normalized);
      if (existing) {
        throw new TypeError(
          `Config extension "${normalized}" is registered by both `
          + `"${existing.name}" and "${plugin.name}".`,
        );
      }
      parsers.set(normalized, plugin);
    }
  }

  return {
    extensions: [...parsers.keys()],
    get(extension) {
      return parsers.get(normalizeExtension(extension));
    },
  };
}

export async function loadConfigFile(
  file: string,
  context: ConfigContext,
  packageField: string,
  parsers: ParserRegistry,
): Promise<unknown> {
  try {
    const source = await readFile(file, 'utf8');

    if (basename(file) === 'package.json') {
      return readPackageField(source, file, packageField);
    }

    const extension = resolveParserExtension(file, parsers);
    const parser = parsers.get(extension);
    if (!parser) {
      throw new ConfigParseError(
        `No parser registered for "${extension || '(none)'}". `
        + `Install a matching plugin and pass it in loadConfig({ plugins: [...] }).`,
        file,
      );
    }

    return await parser.parse(source, {
      ...context,
      file,
      source,
    } satisfies ConfigParserContext);
  } catch (error) {
    if (error instanceof ConfigParseError) throw error;
    throw new ConfigParseError(
      `Failed to load config file: ${errorMessage(error)}`,
      file,
      error,
    );
  }
}

export async function hasPackageField(
  file: string,
  packageField: string,
): Promise<boolean> {
  try {
    const source = await readFile(file, 'utf8');
    const value = JSON.parse(source) as Record<string, unknown>;
    return Object.prototype.hasOwnProperty.call(value, packageField);
  } catch {
    return false;
  }
}

function readPackageField(
  source: string,
  file: string,
  packageField: string,
): unknown {
  const packageJson = JSON.parse(source) as Record<string, unknown>;
  if (!(packageField in packageJson)) {
    throw new ConfigParseError(
      `package.json does not contain a "${packageField}" field.`,
      file,
    );
  }
  return packageJson[packageField];
}

function validatePlugin(plugin: ZooconfigPlugin): void {
  if (!plugin || typeof plugin !== 'object') {
    throw new TypeError('Config plugins must be objects.');
  }
  if (!plugin.name || typeof plugin.name !== 'string') {
    throw new TypeError('Config plugins must have a non-empty name.');
  }
  if (!Array.isArray(plugin.extensions) || plugin.extensions.length === 0) {
    throw new TypeError(`Plugin "${plugin.name}" must register at least one extension.`);
  }
  if (typeof plugin.parse !== 'function') {
    throw new TypeError(`Plugin "${plugin.name}" must provide a parse() function.`);
  }
}

function resolveParserExtension(
  file: string,
  parsers: ParserRegistry,
): string {
  const filename = basename(file).toLowerCase();

  // Dot-prefixed files such as `.env`, `.env.local`, and `.env.production`
  // have no conventional extension. Prefer a registered leading extension.
  if (filename.startsWith('.') && filename !== '.') {
    const nextDot = filename.indexOf('.', 1);
    const leadingExtension = nextDot === -1
      ? filename
      : filename.slice(0, nextDot);
    if (parsers.get(leadingExtension)) return leadingExtension;
  }

  return extname(file).toLowerCase();
}

function normalizeExtension(extension: string): string {
  return (extension.startsWith('.') ? extension : `.${extension}`).toLowerCase();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
