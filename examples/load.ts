import { loadConfig } from '@zooconfig/core';
import jsPlugin from '@zooconfig/js';

const config = await loadConfig({ plugins: [jsPlugin] });

console.log(config);
