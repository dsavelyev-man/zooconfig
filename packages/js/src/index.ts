import type { ZooconfigPlugin } from '@zooconfig/core';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  moduleCache: false,
  fsCache: false,
});

export const jsPlugin = {
  name: 'js',
  extensions: ['.ts', '.mts', '.cts', '.tsx', '.js', '.mjs', '.cjs', '.jsx'],
  async parse(_source, context) {
    if (!context.file) {
      throw new Error('JavaScript configs require an absolute file path.');
    }

    let exported = await jiti.import(context.file, { default: true });
    if (typeof exported === 'function') {
      exported = await exported(context);
    }
    return await exported;
  },
} satisfies ZooconfigPlugin;

export default jsPlugin;
