export type MaybePromise<T> = T | Promise<T>;

export type ConfigObject = Record<string, unknown>;

export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type EnvironmentMap<T extends ConfigObject> = Record<string, DeepPartial<T>>;

export type ConfigWithEnvironments<T extends ConfigObject> = T & {
  /** Environment-specific overlays consumed by loadConfig(). */
  $env?: EnvironmentMap<T>;
};

export type ConfigContext = {
  /** Active environment name. Defaults to NODE_ENV or "development". */
  env: string;
  /** Directory used for config discovery. */
  cwd: string;
  /** Absolute path of the config file being evaluated, when there is one. */
  file?: string;
};

export type ConfigParserContext = ConfigContext & {
  /** Raw file source. */
  source: string;
};

export type ZooconfigPlugin = {
  /** Human-readable plugin name used in errors. */
  name: string;
  /** File extensions handled by this plugin, for example [".yaml", ".yml"]. */
  extensions: readonly string[];
  /** Parse a config file. The return value must be a plain config object. */
  parse(source: string, context: ConfigParserContext): MaybePromise<unknown>;
};

export type ConfigFactory<T extends ConfigObject = ConfigObject> = (
  context: ConfigContext,
) => MaybePromise<ConfigWithEnvironments<T> | T>;

export type ConfigModule<T extends ConfigObject = ConfigObject> =
  | ConfigWithEnvironments<T>
  | ConfigFactory<T>
  | Promise<ConfigWithEnvironments<T> | T>;

export type ConfigSchema<T> = {
  parse(input: unknown): MaybePromise<T>;
};

export type ConfigSafeSchema<T> = {
  safeParse(input: unknown):
    | { success: true; data: T }
    | { success: false; error: unknown };
};

export type Logger = Pick<Console, 'warn'>;

export type LoadConfigOptions<T = unknown> = {
  /**
   * Explicit config file. When omitted, zooconfig searches for a config file
   * using `names` and `searchUp`.
   */
  file?: string;
  /** Working directory used for discovery and dotenv files. Defaults to process.cwd(). */
  cwd?: string;
  /** Active environment. Defaults to NODE_ENV or "development". */
  env?: string;
  /** Config file stems to search for, in order. Defaults to ["zooconfig", "app.config"]. */
  names?: string[];
  /** File extensions to search, in order. Defaults to JSON plus all plugin extensions. */
  extensions?: string[];
  /** Parser plugins. Core always includes JSON; add @zooconfig/yaml, @zooconfig/toml, etc. for more. */
  plugins?: ZooconfigPlugin[];
  /** Walk parent directories until a config is found. Defaults to true. */
  searchUp?: boolean;
  /** Load environment-specific and local overlays. Defaults to true. */
  overlays?: boolean;
  /** Deep-merge arrays instead of replacing them. Defaults to false. */
  mergeArrays?: boolean;
  /** Load .env files without mutating process.env. Defaults to true. */
  dotenv?: boolean;
  /** Prefix for config env-var overrides. Defaults to "APP_". */
  envPrefix?: string;
  /** Separator for nested env-var overrides. Defaults to "__". */
  envSeparator?: string;
  /** Expand ${VAR} and ${VAR:-fallback} in string values. Defaults to true. */
  expandEnv?: boolean;
  /** How to handle unresolved env interpolation. Defaults to "throw". */
  missingEnv?: 'throw' | 'ignore' | 'empty';
  /** Property name read from package.json. Defaults to "zooconfig". */
  packageField?: string;
  /** Optional validator. Its return value becomes the final config. */
  validate?: (config: unknown) => MaybePromise<T>;
  /** Optional Zod-compatible schema. */
  schema?: ConfigSchema<T> | ConfigSafeSchema<T>;
  /** Optional logger used for non-fatal warnings. */
  logger?: Logger;
};

export type LoadedConfig<T> = {
  config: T;
  env: string;
  cwd: string;
  files: string[];
};
