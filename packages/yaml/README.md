# @zooconfig/yaml

Documentation: [zooconfig.vercel.app](https://zooconfig.vercel.app/)

YAML parser plugin for [`@zooconfig/core`](https://www.npmjs.com/package/@zooconfig/core).

## Install

```sh
npm install @zooconfig/core @zooconfig/yaml
```

## Use

```ts
import { loadConfig } from '@zooconfig/core';
import yamlPlugin from '@zooconfig/yaml';

const config = await loadConfig({ plugins: [yamlPlugin] });
```

Handles `.yaml` and `.yml` files. Supports overlays such as
`zooconfig.production.yaml` and `zooconfig.local.yml`.

## CLI

```sh
npx zooconfig --plugin @zooconfig/yaml --config ./zooconfig.yaml
```

## License

MIT
