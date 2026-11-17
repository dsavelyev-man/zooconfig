# @zooconfig

A plugin-based configuration system for Node.js. One core loader, one predictable
config object, and a parser plugin only when you need one.

The project is an npm-workspaces monorepo under the `@zooconfig/*` scope.

| Package | Purpose | Extensions |
| --- | --- | --- |
| `@zooconfig/core` | Loader, discovery, overlays, dotenv, env overrides, validation, CLI | `.json` |
| `@zooconfig/dotenv` | Dotenv config-file parser | `.env` |
| `@zooconfig/jsonc` | JSON-with-comments parser | `.jsonc` |
| `@zooconfig/js` | JavaScript and TypeScript parser via jiti | `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`, `.jsx`, `.tsx` |
| `@zooconfig/toml` | TOML parser | `.toml` |
| `@zooconfig/yaml` | YAML parser | `.yaml`, `.yml` |

Core includes JSON parsing and dotenv environment loading. YAML, TOML, JSONC,
JS/TS, and dotenv-as-config parsing are opt-in plugin packages.

## Install

For JSON configs, install core only:

```sh
npm install @zooconfig/core
```

For YAML:

```sh
npm install @zooconfig/core @zooconfig/yaml
```

For a `.env` file used as the config object itself:

```sh
npm install @zooconfig/core @zooconfig/dotenv
```

Install the plugin packages whose formats your project actually uses.

## Quick start

```ts
// zooconfig.yaml
app:
  name: example
  port: 3000
database:
  url: postgres://localhost/example
  pool: 10
$env:
  production:
    app:
      port: 8080
    database:
      pool: 50
```

```ts
import { loadConfig } from '@zooconfig/core';
import yamlPlugin from '@zooconfig/yaml';

const config = await loadConfig({
  plugins: [yamlPlugin],
});

console.log(config.app.port);
```

The same API works for every plugin:

```ts
import { loadConfig } from '@zooconfig/core';
import dotenvPlugin from '@zooconfig/dotenv';
import jsoncPlugin from '@zooconfig/jsonc';
import jsPlugin from '@zooconfig/js';
import tomlPlugin from '@zooconfig/toml';
import yamlPlugin from '@zooconfig/yaml';

const config = await loadConfig({
  plugins: [dotenvPlugin, jsoncPlugin, jsPlugin, tomlPlugin, yamlPlugin],
});
```

## Discovery

`loadConfig()` searches the current directory and its parents for:

- `zooconfig.config.<extension>`
- `zooconfig.<extension>`
- `app.config.<extension>`
- `package.json#zooconfig`

Only JSON is discoverable until you register another parser plugin. Plugins can
also narrow `extensions` manually:

```ts
await loadConfig({
  plugins: [yamlPlugin],
  names: ['config'],
  extensions: ['.yaml'],
});
```

Use an explicit file when discovery is not desirable:

```ts
await loadConfig({
  file: './config/app.toml',
  plugins: [tomlPlugin],
});
```

## Precedence

Layers are deep-merged in this order, later layers winning:

1. Base config file
2. Its matching `$env[env]` block
3. Environment overlay, for example `zooconfig.production.yaml`
4. Local overlay, for example `zooconfig.local.yaml`
5. Environment-local overlay, for example `zooconfig.production.local.yaml`
6. Environment variables with the configured prefix

Arrays replace by default. Pass `mergeArrays: true` to concatenate them.

The active environment defaults to `NODE_ENV`, then `development`.

```sh
APP_DATABASE__POOL=100 APP_APP__PORT=4000 node app.js
```

Double underscores create nested paths. Values are coerced to boolean, number,
`null`, array, or object where possible.

## Dotenv

Core reads these files relative to `cwd`, without mutating `process.env`:

```text
.env
.env.<environment>
.env.local
.env.<environment>.local
```

Later files win. The real `process.env` wins over values read from files. Disable
with `dotenv: false`.

## Interpolation

String values can reference environment variables:

```yaml
url: http://${HOST:-localhost}:${PORT:-3000}
```

- Missing variables throw by default.
- `missingEnv: 'empty'` replaces missing references with `''`.
- `missingEnv: 'ignore'` keeps `${VAR}` untouched.
- Escape literals with `\${NAME}`.

## Validation

Any Zod-compatible schema with `safeParse()` or `parse()` works:

```ts
import { z } from 'zod';
import { loadConfig } from '@zooconfig/core';
import yamlPlugin from '@zooconfig/yaml';

const schema = z.object({
  app: z.object({ port: z.number().int().positive() }),
});

const config = await loadConfig({ plugins: [yamlPlugin], schema });
```

`validate(input)` is also supported for custom parsing and transformation.

## Plugin API

A plugin is a plain object:

```ts
import type { ZooconfigPlugin } from '@zooconfig/core';

const customPlugin = {
  name: 'custom',
  extensions: ['.custom'],
  parse(source, context) {
    return parseCustomFormat(source, context);
  },
} satisfies ZooconfigPlugin;

const config = await loadConfig({ plugins: [customPlugin] });
```

`parse()` may return a value or a promise. It must return an object; the core
then applies overlays, env overrides, interpolation, and validation.

## CLI

`@zooconfig/core` installs a `zooconfig` binary. Register plugins explicitly:

```sh
npx zooconfig --plugin @zooconfig/yaml --config ./zooconfig.yaml --env production
```

CLI options:

```text
-c, --config <file>    Explicit config file
-n, --name <name>      Config file stem to discover (repeatable)
-p, --plugin <module>  Parser plugin module (repeatable)
-e, --env <name>       Environment name
    --cwd <dir>        Working directory
    --prefix <prefix>  Env-var override prefix
    --no-dotenv        Skip .env files
    --no-overlays      Skip environment/local overlays
-h, --help             Show help
-v, --version          Show version
```

The CLI always prints JSON, so core does not depend on a YAML serializer.

## Documentation

The documentation site is built with [Vocs](https://vocs.dev) and lives in `docs/`.

```sh
npm run docs:dev      # start the docs dev server
npm run docs:build    # build the static docs site
npm run docs:preview  # preview the production build
```

## Development

```sh
npm install
npm run build
npm test
npm run typecheck
npm run audit
```

Build output is written to each package's `dist/` directory.

## Contributors

See [CONTRIBUTORS.md](./CONTRIBUTORS.md).

## License

MIT
