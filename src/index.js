/**
 * LGTM APM Node - One-line OpenTelemetry APM for LGTM stack (Grafana Alloy / Tempo / Mimir).
 * Import, call initAPM({ collectorUrl, serviceName }), and APM starts.
 */

const { initAPM, shutdown, getLogger, setLogger } = require('./instrumentation.js');
const { createLogger } = require('./logger.js');

module.exports = {
  initAPM,
  shutdown,
  getLogger,
  setLogger,
  createLogger,
};
