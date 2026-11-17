import type { ZooconfigPlugin } from '@zooconfig/core';
import { parse } from 'dotenv';

export const dotenvPlugin = {
  name: 'dotenv',
  extensions: ['.env'],
  parse(source) {
    return parse(source);
  },
} satisfies ZooconfigPlugin;

export default dotenvPlugin;
