import type { ZooconfigPlugin } from '@zooconfig/core';
import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';

export const jsoncPlugin = {
  name: 'jsonc',
  extensions: ['.jsonc'],
  parse(source, context) {
    const errors: ParseError[] = [];
    const value = parse(source, errors, {
      allowTrailingComma: true,
      disallowComments: false,
    });

    if (errors.length > 0) {
      const first = errors[0]!;
      throw new Error(
        `Invalid JSONC (${printParseErrorCode(first.error)} at offset ${first.offset}) in ${context.file ?? 'config'}.`,
      );
    }

    return value;
  },
} satisfies ZooconfigPlugin;

export default jsoncPlugin;
