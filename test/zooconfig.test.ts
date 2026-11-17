import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ConfigNotFoundError,
  ConfigValidationError,
  EnvExpansionError,
  createConfigLoader,
  defineConfig,
  loadConfig,
  loadConfigWithMeta,
} from '../packages/core/src/index.js';
import { dotenvPlugin } from '../packages/dotenv/src/index.js';
import { jsoncPlugin } from '../packages/jsonc/src/index.js';
import { jsPlugin } from '../packages/js/src/index.js';
import { tomlPlugin } from '../packages/toml/src/index.js';
import { yamlPlugin } from '../packages/yaml/src/index.js';

const tempDirs: string[] = [];
const touchedEnv = new Set<string>();

afterEach(async () => {
  for (const key of touchedEnv) delete process.env[key];
  touchedEnv.clear();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('zooconfig', () => {
  it('discovers JSON config and applies env, local, and env-var precedence', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'zooconfig.json'), JSON.stringify({
      app: {
        name: 'demo',
        url: 'http://${ZZ_INTERP_HOST:-localhost}:${ZZ_INTERP_PORT}',
      },
      database: { url: 'postgres://base', pool: 5 },
      flags: ['base'],
      $env: {
        production: {
          database: { pool: 10 },
          flags: ['from-env-section'],
        },
      },
    }));
    await writeFile(join(dir, 'zooconfig.production.json'), JSON.stringify({
      database: { url: 'postgres://production' },
      flags: ['from-env-file'],
    }));
    await writeFile(join(dir, 'zooconfig.local.json'), JSON.stringify({
      database: { pool: 20 },
      flags: ['from-local'],
    }));
    await writeFile(join(dir, 'zooconfig.production.local.json'), JSON.stringify({
      app: { name: 'demo-production' },
      flags: ['from-production-local'],
    }));
    await writeFile(join(dir, '.env'), [
      'ZZ_INTERP_PORT=3000',
      'ZOO_DATABASE__POOL=40',
      'ZOO_APP__NAME=from-dotenv',
    ].join('\n'));

    setEnv('ZOO_APP__NAME', 'from-process');
    setEnv('ZOO_DATABASE__POOL', '42');

    const result = await loadConfigWithMeta({
      cwd: dir,
      env: 'production',
      envPrefix: 'ZOO_',
    }) as {
      config: {
        app: { name: string; url: string };
        database: { url: string; pool: number };
        flags: string[];
      };
      files: string[];
    };

    expect(result.config).toEqual({
      app: { name: 'from-process', url: 'http://localhost:3000' },
      database: { url: 'postgres://production', pool: 42 },
      flags: ['from-production-local'],
    });
    expect(result.files.map((file) => file.split('/').at(-1))).toEqual([
      'zooconfig.json',
      'zooconfig.production.json',
      'zooconfig.local.json',
      'zooconfig.production.local.json',
    ]);
  });

  it('loads .env files as config objects', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, '.env'), [
      'NAME=zooconfig',
      'PORT=3000',
      'DATABASE_URL="postgres://localhost/example"',
    ].join('\n'));

    const config = await loadConfig({
      cwd: dir,
      dotenv: false,
      file: '.env',
      plugins: [dotenvPlugin],
    });

    expect(config).toEqual({
      NAME: 'zooconfig',
      PORT: '3000',
      DATABASE_URL: 'postgres://localhost/example',
    });
  });

  it('loads JSONC, YAML, and TOML through plugins', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'jsonc.jsonc'), `{
      // comments and trailing commas are accepted
      "jsonc": true,
    }`);
    await writeFile(join(dir, 'yaml.yaml'), 'yaml: true\nnested:\n  value: 1\n');
    await writeFile(join(dir, 'toml.toml'), 'toml = true\n[section]\nvalue = 2\n');

    await expect(loadConfig({ file: 'jsonc.jsonc', cwd: dir, dotenv: false, plugins: [jsoncPlugin] }))
      .resolves.toEqual({ jsonc: true });
    await expect(loadConfig({ file: 'yaml.yaml', cwd: dir, dotenv: false, plugins: [yamlPlugin] }))
      .resolves.toEqual({ yaml: true, nested: { value: 1 } });
    await expect(loadConfig({ file: 'toml.toml', cwd: dir, dotenv: false, plugins: [tomlPlugin] }))
      .resolves.toEqual({ toml: true, section: { value: 2 } });
  });

  it('loads TypeScript config factories with environment context', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'zooconfig.ts'), `
      export default (ctx: { env: string; cwd: string }) => ({
        env: ctx.env,
        cwd: ctx.cwd,
        feature: { enabled: ctx.env === 'test' },
      });
    `);

    const config = await loadConfig({
      cwd: dir,
      env: 'test',
      dotenv: false,
      plugins: [jsPlugin],
    });

    expect(config).toEqual({
      env: 'test',
      cwd: dir,
      feature: { enabled: true },
    });
  });

  it('reads package.json#zooconfig when no standalone file exists', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'package.json'), JSON.stringify({
      name: 'fixture',
      zooconfig: { port: 8080, mode: 'package' },
    }));

    await expect(loadConfig({ cwd: dir, dotenv: false }))
      .resolves.toEqual({ port: 8080, mode: 'package' });
  });

  it('supports schemas and wraps validation failures', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'zooconfig.json'), JSON.stringify({ port: 'nope' }));

    const schema = {
      safeParse(value: unknown) {
        const port = (value as { port?: unknown }).port;
        return typeof port === 'number'
          ? { success: true as const, data: { port } }
          : { success: false as const, error: new Error('port must be a number') };
      },
    };

    await expect(loadConfig({ cwd: dir, dotenv: false, schema }))
      .rejects.toBeInstanceOf(ConfigValidationError);

    const result = await loadConfig({
      cwd: dir,
      dotenv: false,
      validate: () => ({ parsed: true }),
    });
    expect(result).toEqual({ parsed: true });
  });

  it('handles interpolation fallbacks, missing variables, and escaped references', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'zooconfig.json'), JSON.stringify({
      url: '${ZOO_MISSING_ZOO_URL:-https://example.test}',
      literal: '\\${DO_NOT_EXPAND}',
    }));

    await expect(loadConfig({ cwd: dir, dotenv: false })).resolves.toEqual({
      url: 'https://example.test',
      literal: '${DO_NOT_EXPAND}',
    });

    await writeFile(join(dir, 'zooconfig.json'), JSON.stringify({ url: '${ZOO_MISSING_ZOO_URL}' }));
    await expect(loadConfig({ cwd: dir, dotenv: false }))
      .rejects.toBeInstanceOf(EnvExpansionError);
  });

  it('can merge arrays when requested', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'zooconfig.json'), JSON.stringify({ values: [1] }));
    await writeFile(join(dir, 'zooconfig.test.json'), JSON.stringify({ values: [2, 3] }));

    await expect(loadConfig({ cwd: dir, env: 'test', dotenv: false }))
      .resolves.toEqual({ values: [2, 3] });
    await expect(loadConfig({
      cwd: dir,
      env: 'test',
      dotenv: false,
      mergeArrays: true,
    })).resolves.toEqual({ values: [1, 2, 3] });
  });

  it('defines typed config and caches loader results', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'zooconfig.json'), JSON.stringify({ count: 1 }));

    const definition = defineConfig({
      count: 1,
      $env: { production: { count: 2 } },
    });
    expect(definition.count).toBe(1);

    const load = createConfigLoader<{ count: number }>({
      cwd: dir,
      dotenv: false,
    });
    const first = await load();
    const second = await load();
    expect(first).toBe(second);

    load.clear();
    const third = await load();
    expect(third).not.toBe(first);
  });

  it('keeps core JSON-only and asks for a parser plugin', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'zooconfig.yaml'), 'name: no-plugin\n');

    await expect(loadConfig({ file: 'zooconfig.yaml', cwd: dir, dotenv: false }))
      .rejects.toMatchObject({ code: 'CONFIG_PARSE_ERROR' });
  });

  it('supports inline custom plugins', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'zooconfig.custom'), 'name=custom\nport=9000\n');

    const config = await loadConfig({
      cwd: dir,
      dotenv: false,
      plugins: [{
        name: 'custom',
        extensions: ['.custom'],
        parse(source) {
          return Object.fromEntries(source.trim().split('\n').map((line) => {
            const [key, value] = line.split('=');
            return [key, Number.isNaN(Number(value)) ? value : Number(value)];
          }));
        },
      }],
    });

    expect(config).toEqual({ name: 'custom', port: 9000 });
  });

  it('rejects plugins that register the same extension', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'zooconfig.json'), '{}');

    await expect(loadConfig({
      cwd: dir,
      dotenv: false,
      plugins: [
        { name: 'duplicate-a', extensions: ['.dup'], parse: () => ({}) },
        { name: 'duplicate-b', extensions: ['.dup'], parse: () => ({}) },
      ],
    })).rejects.toThrow('registered by both');
  });

  it('reports a useful error when no config exists', async () => {
    const dir = await tempDir();
    await expect(loadConfig({ cwd: dir, searchUp: false, dotenv: false }))
      .rejects.toBeInstanceOf(ConfigNotFoundError);
  });

  it('does not mutate process.env while reading dotenv files', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'zooconfig.json'), JSON.stringify({ port: 1 }));
    await writeFile(join(dir, '.env'), 'ZOO_SHOULD_NOT_LEAK=yes\n');
    await loadConfig({ cwd: dir, dotenv: true });

    expect(process.env.ZOO_SHOULD_NOT_LEAK).toBeUndefined();
  });
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'zooconfig-'));
  tempDirs.push(dir);
  return dir;
}

function setEnv(key: string, value: string): void {
  process.env[key] = value;
  touchedEnv.add(key);
}
