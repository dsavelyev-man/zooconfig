export type ZooconfigErrorCode =
  | 'CONFIG_NOT_FOUND'
  | 'CONFIG_PARSE_ERROR'
  | 'CONFIG_VALIDATION_ERROR'
  | 'ENV_EXPANSION_ERROR';

export class ZooconfigError extends Error {
  readonly code: ZooconfigErrorCode;
  readonly file?: string;

  constructor(
    code: ZooconfigErrorCode,
    message: string,
    options: { file?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'ZooconfigError';
    this.code = code;
    this.file = options.file;
  }
}

export class ConfigNotFoundError extends ZooconfigError {
  constructor(message: string) {
    super('CONFIG_NOT_FOUND', message);
    this.name = 'ConfigNotFoundError';
  }
}

export class ConfigParseError extends ZooconfigError {
  constructor(message: string, file: string, cause?: unknown) {
    super('CONFIG_PARSE_ERROR', message, { file, cause });
    this.name = 'ConfigParseError';
  }
}

export class ConfigValidationError extends ZooconfigError {
  constructor(message: string, cause?: unknown) {
    super('CONFIG_VALIDATION_ERROR', message, { cause });
    this.name = 'ConfigValidationError';
  }
}

export class EnvExpansionError extends ZooconfigError {
  constructor(message: string, file?: string) {
    super('ENV_EXPANSION_ERROR', message, { file });
    this.name = 'EnvExpansionError';
  }
}
