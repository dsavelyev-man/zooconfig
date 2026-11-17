import { defineConfig } from '@zooconfig/core';

export default defineConfig({
  app: {
    name: 'typescript-example',
    url: 'http://${HOST:-localhost}:${PORT:-3000}',
  },
  database: {
    url: 'postgres://localhost/example',
    pool: 10,
  },
  $env: {
    production: {
      database: { pool: 50 },
    },
    test: {
      database: { url: 'postgres://localhost/example_test' },
    },
  },
});
