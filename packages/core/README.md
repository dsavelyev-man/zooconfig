# @zooconfig/core

Plugin-based configuration for Node.js. Core parses JSON and provides discovery,
deep merging, environment/local overlays, dotenv loading, env-var overrides,
interpolation, validation, caching, and a CLI.

YAML, TOML, JSONC, dotenv config-file, and JavaScript/TypeScript support live in separate packages.

## Install

```sh
npm install @zooconfig/core
```

Add only the parser plugins you need:

```sh
npm install @zooconfig/dotenv
npm install @zooconfig/yaml
npm install @zooconfig/toml
npm install @zooconfig/jsonc
npm install @zooconfig/js
```

## JSON quick start

```ts
// zooconfig.json
{
  "app": { "port": 3000 },
  "$env": {
    "production": { "app": { "port": 8080 } }
  }
}
```

```ts
import { loadConfig } from '@zooconfig/core';

const config = await loadConfig();
```

## Plugin quick start

```ts
import { loadConfig } from '@zooconfig/core';
import yamlPlugin from '@zooconfig/yaml';

const config = await loadConfig({
  plugins: [yamlPlugin],
});
```

A config module may export an object, a promise, or a function. Functions receive
`{ env, cwd, file }` and may be async.

## Discovery

Core searches the current directory and its parents for:

- `zooconfig.config.<extension>`
- `zooconfig.<extension>`
- `app.config.<extension>`
- `package.json#zooconfig`

Discovery extensions are `.json` plus every registered plugin extension. Pass
`file`, `names`, or `extensions` to override discovery.

## Precedence

1. Base config
2. `$env[environment]`
3. `zooconfig.<environment>.<ext>`
4. `zooconfig.local.<ext>`
5. `zooconfig.<environment>.local.<ext>`
6. Env-var overrides

Arrays replace by default. Set `mergeArrays: true` to concatenate.

## Env overrides and dotenv

```sh
APP_APP__PORT=4000 APP_DATABASE__POOL=100 node app.js
```

Core reads `.env`, `.env.<env>`, `.env.local`, and `.env.<env>.local` in memory.
It does not mutate `process.env`. Real process variables win over dotenv values.

Disable dotenv with `dotenv: false`.

## Interpolation

```yaml
url: http://${HOST:-localhost}:${PORT:-3000}
```

Missing references throw by default. Use `missingEnv: 'empty'` or
`missingEnv: 'ignore'` to change that. Escape literals with `\${NAME}`.

## Validation

```ts
const config = await loadConfig({
  schema: myZodSchema,
});
```

Any schema with `safeParse()` or `parse()` works. You can also pass a custom
`validate(input)` function whose return value becomes the final config.

## Plugin contract

```ts
import type { ZooconfigPlugin } from '@zooconfig/core';

const plugin = {
  name: 'custom',
  extensions: ['.custom'],
  parse(source, context) {
    return parseCustom(source, context);
  },
} satisfies ZooconfigPlugin;
```

Extensions are normalized and checked for duplicate ownership. Plugins are
composed in the order passed to `loadConfig()`.

## CLI

```sh
npx zooconfig --config ./zooconfig.json
npx zooconfig --plugin @zooconfig/yaml --config ./zooconfig.yaml --env production
```

The CLI prints resolved JSON.

## API

```ts
loadConfig(options?): Promise<T>
loadConfigWithMeta(options?): Promise<{ config: T; env: string; cwd: string; files: string[] }>
createConfigLoader(options?): (() => Promise<T>) & { clear(): void }
defineConfig(config): config
```

## License

MIT
