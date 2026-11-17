# @zooconfig/toml

TOML parser plugin for [`@zooconfig/core`](https://www.npmjs.com/package/@zooconfig/core).

## Install

```sh
npm install @zooconfig/core @zooconfig/toml
```

## Use

```ts
import { loadConfig } from '@zooconfig/core';
import tomlPlugin from '@zooconfig/toml';

const config = await loadConfig({ plugins: [tomlPlugin] });
```

Handles `.toml` files and overlays such as `zooconfig.production.toml`.

## CLI

```sh
npx zooconfig --plugin @zooconfig/toml --config ./zooconfig.toml
```

## License

MIT
