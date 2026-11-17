import type { ZooconfigPlugin } from '@zooconfig/core';
import { parse } from 'yaml';

export const yamlPlugin = {
  name: 'yaml',
  extensions: ['.yaml', '.yml'],
  parse(source) {
    return parse(source);
  },
} satisfies ZooconfigPlugin;

export default yamlPlugin;
