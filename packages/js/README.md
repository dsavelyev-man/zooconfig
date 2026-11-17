# @zooconfig/js

JavaScript and TypeScript parser plugin for
[`@zooconfig/core`](https://www.npmjs.com/package/@zooconfig/core), powered by jiti.

## Install

```sh
npm install @zooconfig/core @zooconfig/js
```

## Use

```ts
import { loadConfig } from '@zooconfig/core';
import jsPlugin from '@zooconfig/js';

const config = await loadConfig({ plugins: [jsPlugin] });
```

Handles `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`, `.jsx`, and `.tsx`.

Config modules may export an object, a promise, or a function:

```ts
export default async ({ env, cwd }: { env: string; cwd: string }) => ({
  env,
  cwd,
  production: env === 'production',
});
```

JavaScript and TypeScript configs execute code. Only load trusted files.

## CLI

```sh
npx zooconfig --plugin @zooconfig/js --config ./zooconfig.ts
```

## License

MIT
