/**
 * Structured JSON logger. One line per event, JSON-encoded for PM2 + Docker log drivers
 * to parse cleanly. Never log PII (phone, email, payment IDs). Pass userId only.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export interface Logger {
  child(ctx: LogContext): Logger;
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, err?: unknown, ctx?: LogContext): void;
}

function emit(level: LogLevel, base: LogContext, msg: string, extra?: LogContext): void {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...base,
    ...(extra ?? {}),
  };
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(JSON.stringify(line) + '\n');
}

function serializeErr(err: unknown): LogContext {
  if (err instanceof Error) {
    return { err: { message: err.message, name: err.name, stack: err.stack } };
  }
  return { err: { message: String(err) } };
}

function build(base: LogContext): Logger {
  return {
    child(ctx) {
      return build({ ...base, ...ctx });
    },
    debug(msg, ctx) {
      emit('debug', base, msg, ctx);
    },
    info(msg, ctx) {
      emit('info', base, msg, ctx);
    },
    warn(msg, ctx) {
      emit('warn', base, msg, ctx);
    },
    error(msg, err, ctx) {
      emit('error', base, msg, { ...(err !== undefined ? serializeErr(err) : {}), ...(ctx ?? {}) });
    },
  };
}

export const log: Logger = build({ svc: 'workers' });
