# @zooconfig/dotenv

Dotenv parser plugin for [`@zooconfig/core`](https://www.npmjs.com/package/@zooconfig/core).
It reads `.env`-formatted files as configuration objects.

## Install

```sh
npm install @zooconfig/core @zooconfig/dotenv
```

## Use

```ts
import { loadConfig } from '@zooconfig/core';
import dotenvPlugin from '@zooconfig/dotenv';

const config = await loadConfig({
  file: './config.env',
  plugins: [dotenvPlugin],
});
```

The plugin also supports a literal `.env` file when passed explicitly:

```ts
const config = await loadConfig({
  file: './.env',
  plugins: [dotenvPlugin],
});
```

Values are returned as strings, matching dotenv semantics. Apply a schema or
`validate()` function when you need typed values.

The core loader's built-in dotenv support is separate. It reads `.env` files
into environment variables for interpolation and `APP_*` overrides. This plugin
reads a `.env`-formatted file as the config object itself.

## CLI

```sh
npx zooconfig --plugin @zooconfig/dotenv --config ./.env
```

## License

MIT
