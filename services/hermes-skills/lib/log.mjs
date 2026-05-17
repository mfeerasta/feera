// Tiny structured JSON logger shared by all Hermes skills.
// One line per event, JSON-encoded for hermes daemon / journald to parse.
// NEVER log PII (phone, email, payment id). Pass userId only.

function emit(level, base, msg, extra) {
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

function serializeErr(err) {
  if (err instanceof Error) {
    return { err: { message: err.message, name: err.name, stack: err.stack } };
  }
  return { err: { message: String(err) } };
}

export function buildLogger(skillName) {
  const base = { svc: 'hermes', skill: skillName };
  return {
    debug: (msg, ctx) => emit('debug', base, msg, ctx),
    info: (msg, ctx) => emit('info', base, msg, ctx),
    warn: (msg, ctx) => emit('warn', base, msg, ctx),
    error: (msg, err, ctx) =>
      emit('error', base, msg, {
        ...(err !== undefined ? serializeErr(err) : {}),
        ...(ctx ?? {}),
      }),
  };
}
