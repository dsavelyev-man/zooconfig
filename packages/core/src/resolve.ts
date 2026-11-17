import { access } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { ConfigNotFoundError, ConfigValidationError } from './errors.js';
import {
  applyEnvOverrides,
  expandEnvironment,
  loadEnvVars,
} from './env.js';
import {
  createParserRegistry,
  hasPackageField,
  loadConfigFile,
} from './loaders.js';
import { isPlainObject, mergeConfigs } from './merge.js';
import type {
  ConfigContext,
  ConfigSafeSchema,
  ConfigSchema,
  ConfigWithEnvironments,
  LoadConfigOptions,
  LoadedConfig,
} from './types.js';

const DEFAULT_NAMES = ['zooconfig', 'app.config'];

export async function loadConfigWithMeta<T = unknown>(
  options: LoadConfigOptions<T> = {},
): Promise<LoadedConfig<T>> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const env = options.env ?? process.env.NODE_ENV ?? 'development';
  const parsers = createParserRegistry(options.plugins);
  const extensions = normalizeExtensions(
    options.extensions ?? parsers.extensions,
  );
  const names = options.names ?? DEFAULT_NAMES;
  const packageField = options.packageField ?? 'zooconfig';
  const mergeOptions = { mergeArrays: options.mergeArrays ?? false };

  const envVars = await loadEnvVars({
    cwd,
    env,
    enabled: options.dotenv ?? true,
  });

  const baseFile = options.file
    ? await resolveExplicitFile(cwd, options.file, extensions)
    : await discoverConfigFile({
        cwd,
        names,
        extensions,
        searchUp: options.searchUp ?? true,
        packageField,
      });

  if (!baseFile) {
    const patterns = names.flatMap((name) =>
      extensionPatterns(name, extensions).map((pattern) => `  ${pattern}`),
    );
    throw new ConfigNotFoundError(
      [
        `No config file found from ${cwd}.`,
        'Looked for:',
        ...patterns,
        `  package.json#${packageField}`,
        'Pass an explicit file with loadConfig({ file: "..." }).',
      ].join('\n'),
    );
  }

  const context: ConfigContext = { cwd, env, file: baseFile };
  const layers: unknown[] = [];
  const files: string[] = [baseFile];

  const base = await loadConfigFile(baseFile, context, packageField, parsers);
  layers.push(...splitEnvironment(base, env));

  if (options.overlays ?? true) {
    const overlayFiles = await findOverlayFiles(baseFile, env, extensions);
    for (const overlayFile of overlayFiles) {
      files.push(overlayFile);
      const value = await loadConfigFile(
        overlayFile,
        { ...context, file: overlayFile },
        packageField,
        parsers,
      );
      layers.push(...splitEnvironment(value, env));
    }
  }

  let config = mergeConfigs(layers, mergeOptions);
  config = applyEnvOverrides({
    config,
    vars: envVars,
    prefix: options.envPrefix ?? 'APP_',
    separator: options.envSeparator ?? '__',
  });

  if (options.expandEnv ?? true) {
    config = expandEnvironment(config, envVars, {
      missing: options.missingEnv ?? 'throw',
      file: baseFile,
    });
  }

  const validated = await validateConfig(config, options);
  return { config: validated, env, cwd, files };
}

export async function loadConfig<T = unknown>(
  options: LoadConfigOptions<T> = {},
): Promise<T> {
  return (await loadConfigWithMeta(options)).config;
}

export function defineConfig<T extends Record<string, unknown>>(
  config: ConfigWithEnvironments<T>,
): ConfigWithEnvironments<T> {
  return config;
}

export function createConfigLoader<T = unknown>(
  options: LoadConfigOptions<T> = {},
): (() => Promise<T>) & { clear: () => void } {
  let pending: Promise<T> | undefined;

  const loader = (() => {
    pending ??= loadConfig(options);
    return pending;
  }) as (() => Promise<T>) & { clear: () => void };

  loader.clear = () => {
    pending = undefined;
  };

  return loader;
}

async function discoverConfigFile(options: {
  cwd: string;
  names: string[];
  extensions: string[];
  searchUp: boolean;
  packageField: string;
}): Promise<string | undefined> {
  let directory = options.cwd;

  while (true) {
    for (const name of options.names) {
      for (const candidate of extensionPatterns(name, options.extensions)) {
        const file = join(directory, candidate);
        if (await fileExists(file)) return file;
      }
    }

    const packageJson = join(directory, 'package.json');
    if (
      await fileExists(packageJson)
      && await hasPackageField(packageJson, options.packageField)
    ) {
      return packageJson;
    }

    if (!options.searchUp) return undefined;
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

async function resolveExplicitFile(
  cwd: string,
  file: string,
  extensions: string[],
): Promise<string> {
  const absolute = isAbsolute(file) ? file : resolve(cwd, file);
  if (await fileExists(absolute)) return absolute;

  if (extname(absolute) === '') {
    for (const extension of extensions) {
      const candidate = `${absolute}${extension}`;
      if (await fileExists(candidate)) return candidate;
    }
  }

  throw new ConfigNotFoundError(`Config file not found: ${absolute}`);
}

async function findOverlayFiles(
  baseFile: string,
  env: string,
  extensions: string[],
): Promise<string[]> {
  if (baseFile.endsWith('package.json')) return [];

  const directory = dirname(baseFile);
  const extension = extname(baseFile);
  const stem = baseFile.slice(0, -extension.length);
  const overlays: string[] = [];

  for (const suffix of [`.${env}`, '.local', `.${env}.local`]) {
    const candidates = [
      `${stem}${suffix}${extension}`,
      ...extensions
        .filter((candidateExtension) => candidateExtension !== extension)
        .map((candidateExtension) => `${stem}${suffix}${candidateExtension}`),
    ];

    for (const candidate of candidates) {
      if (await fileExists(candidate)) {
        overlays.push(candidate);
        break;
      }
    }
  }

  return overlays;
}

function extensionPatterns(name: string, extensions: string[]): string[] {
  const stems = name.endsWith('.config') ? [name] : [`${name}.config`, name];
  return stems.flatMap((stem) =>
    extensions.map((extension) => `${stem}${extension}`),
  );
}

function splitEnvironment(
  value: unknown,
  env: string,
): unknown[] {
  if (!isPlainObject(value)) return [value];

  const { $env, ...base } = value;
  if (!isPlainObject($env)) return [base];

  const overlay = $env[env];
  return overlay === undefined ? [base] : [base, overlay];
}

async function validateConfig<T>(
  config: Record<string, unknown>,
  options: LoadConfigOptions<T>,
): Promise<T> {
  let value: unknown = config;

  if (options.schema) {
    try {
      if (isSafeSchema(options.schema)) {
        const result = options.schema.safeParse(value);
        if (!result.success) {
          throw result.error;
        }
        value = result.data;
      } else {
        value = await options.schema.parse(value);
      }
    } catch (error) {
      throw new ConfigValidationError(
        `Config validation failed: ${errorMessage(error)}`,
        error,
      );
    }
  }

  if (options.validate) {
    try {
      value = await options.validate(value);
    } catch (error) {
      throw new ConfigValidationError(
        `Config validation failed: ${errorMessage(error)}`,
        error,
      );
    }
  }

  return value as T;
}

function isSafeSchema<T>(
  schema: ConfigSchema<T> | ConfigSafeSchema<T>,
): schema is ConfigSafeSchema<T> {
  return 'safeParse' in schema && typeof schema.safeParse === 'function';
}

function normalizeExtensions(extensions: string[]): string[] {
  return extensions.map((extension) =>
    extension.startsWith('.') ? extension : `.${extension}`,
  );
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if ('issues' in error && Array.isArray(error.issues)) {
      return error.issues
        .map((issue: { path?: PropertyKey[]; message?: string }) => {
          const path = issue.path?.map(String).join('.') || '(root)';
          return `${path}: ${issue.message ?? 'invalid value'}`;
        })
        .join('; ');
    }
    return error.message;
  }
  return String(error);
}

