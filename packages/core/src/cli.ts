#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadConfigWithMeta } from './resolve.js';
import type { ZooconfigPlugin } from './types.js';

const HELP = `zooconfig - plugin-based Node.js config loader

Usage:
  zooconfig [options]

Core only parses JSON. Add plugins for YAML, TOML, JSONC, and JS/TS.

Options:
  -c, --config <file>   Explicit config file
  -n, --name <name>     Config file stem to discover (repeatable)
  -p, --plugin <module> Parser plugin module (repeatable)
  -e, --env <name>      Environment name (default: NODE_ENV or development)
      --cwd <dir>       Working directory (default: process.cwd())
      --prefix <prefix> Env-var override prefix (default: APP_)
      --no-dotenv       Do not read .env files
      --no-overlays     Do not read environment/local overlays
  -h, --help            Show this help
  -v, --version         Show the package version
`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      config: { type: 'string', short: 'c' },
      name: { type: 'string', short: 'n', multiple: true },
      plugin: { type: 'string', short: 'p', multiple: true },
      env: { type: 'string', short: 'e' },
      cwd: { type: 'string' },
      prefix: { type: 'string' },
      'no-dotenv': { type: 'boolean' },
      'no-overlays': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    process.stdout.write(HELP);
    return;
  }

  if (values.version) {
    const packageJson = JSON.parse(
      await readFile(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'),
    ) as { version?: string };
    process.stdout.write(`${packageJson.version ?? 'unknown'}\n`);
    return;
  }

  const cwd = resolve(values.cwd ?? process.cwd());
  const plugins = await loadPlugins(values.plugin ?? [], cwd);
  const result = await loadConfigWithMeta({
    file: values.config,
    names: values.name,
    plugins,
    env: values.env,
    cwd,
    envPrefix: values.prefix,
    dotenv: !values['no-dotenv'],
    overlays: !values['no-overlays'],
  });

  process.stdout.write(`${JSON.stringify(result.config, null, 2)}\n`);
}

async function loadPlugins(
  specifiers: string[],
  cwd: string,
): Promise<ZooconfigPlugin[]> {
  const requireFromCwd = createRequire(join(cwd, 'package.json'));

  return Promise.all(specifiers.map(async (specifier) => {
    const resolved = requireFromCwd.resolve(specifier);
    const module = await import(pathToFileURL(resolved).href) as Record<string, unknown>;
    const candidate = module.default
      ?? module.plugin
      ?? Object.values(module).find(isPlugin);

    if (!candidate) {
      throw new Error(`Plugin "${specifier}" does not export a zooconfig plugin.`);
    }

    return typeof candidate === 'function'
      ? await candidate() as ZooconfigPlugin
      : candidate as ZooconfigPlugin;
  }));
}

function isPlugin(value: unknown): value is ZooconfigPlugin {
  return Boolean(
    value
    && typeof value === 'object'
    && 'extensions' in value
    && 'parse' in value,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`zooconfig: ${message}\n`);
  process.exitCode = 1;
});
