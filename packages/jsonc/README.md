# @zooconfig/jsonc

Documentation: [zooconfig.vercel.app](https://zooconfig.vercel.app/)

JSONC parser plugin for [`@zooconfig/core`](https://www.npmjs.com/package/@zooconfig/core).
JSONC supports comments and trailing commas.

## Install

```sh
npm install @zooconfig/core @zooconfig/jsonc
```

## Use

```ts
import { loadConfig } from '@zooconfig/core';
import jsoncPlugin from '@zooconfig/jsonc';

const config = await loadConfig({ plugins: [jsoncPlugin] });
```

Handles `.jsonc` files and overlays such as `zooconfig.production.jsonc`.

## CLI

```sh
npx zooconfig --plugin @zooconfig/jsonc --config ./zooconfig.jsonc
```

## License

MIT
