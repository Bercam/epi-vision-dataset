const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function serialiseError(value) {
  if (!(value instanceof Error)) {
    return value;
  }
  return {
    name: value.name,
    message: value.message,
    code: value.code,
    stack: value.stack,
  };
}

function serialiseFields(fields) {
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }
    result[key] = serialiseError(value);
  }
  return result;
}

export function createLogger({ level = 'info', stream = process.stdout, base = {} } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  function write(lvl, event, fields = {}) {
    if ((LEVELS[lvl] ?? LEVELS.info) < threshold) {
      return;
    }
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: lvl,
      event,
      ...base,
      ...serialiseFields(fields),
    });
    stream.write(`${line}\n`);
  }

  return {
    debug: (event, fields) => write('debug', event, fields),
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
    child: (extra) => createLogger({ level, stream, base: { ...base, ...extra } }),
  };
}

export function createSilentLogger() {
  return createLogger({ level: 'silent' });
}
