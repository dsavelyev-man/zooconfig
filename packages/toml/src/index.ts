import type { ZooconfigPlugin } from '@zooconfig/core';
import { parse } from 'smol-toml';

export const tomlPlugin = {
  name: 'toml',
  extensions: ['.toml'],
  parse(source) {
    return parse(source);
  },
} satisfies ZooconfigPlugin;

export default tomlPlugin;
