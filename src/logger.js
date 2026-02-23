'use strict';

const { trace } = require('@opentelemetry/api');

/**
 * Simple trace-aware logger that adds trace_id/span_id to every log record.
 * No pino dependency by default; override with custom logger via createLogger({ log: yourLogger }).
 *
 * @param {{
 *   serviceName: string;
 *   environment?: string;
 *   log?: (level: string, message: string, meta: object) => void;
 * }} config
 * @returns {{ log: Function; debug: Function; info: Function; warn: Function; error: Function }}
 */
function createLogger(config) {
  const serviceName = config.serviceName || 'service';
  const environment = config.environment || process.env.NODE_ENV || 'development';
  const customLog = config.log;

  function getTraceContext() {
    const span = trace.getActiveSpan();
    if (span) {
      const ctx = span.spanContext();
      return { trace_id: ctx.traceId, span_id: ctx.spanId };
    }
    return {};
  }

  function emit(level, message, meta = {}) {
    const fields = { service: serviceName, env: environment, ...getTraceContext(), ...meta };
    if (customLog) {
      customLog(level, message, fields);
      return;
    }
    const line = JSON.stringify({ level, message, ...fields });
    if (level === 'error') process.stderr.write(line + '\n');
    else process.stdout.write(line + '\n');
  }

  return {
    log(message, data) {
      emit('info', message, data);
    },
    debug(message, data) {
      emit('debug', message, data);
    },
    info(message, data) {
      emit('info', message, data);
    },
    warn(message, data) {
      emit('warn', message, data);
    },
    error(message, err) {
      const meta = err instanceof Error ? { err: err.message, stack: err.stack } : err;
      emit('error', message, meta);
    },
  };
}

module.exports = { createLogger };
