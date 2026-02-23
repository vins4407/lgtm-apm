/**
 * Express app with APM: initAPM first, then require express.
 * Run: node examples/with-express.js
 */
const { initAPM, createLogger, getLogger } = require('../src/index.js');

initAPM({
  collectorUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
  serviceName: process.env.OTEL_SERVICE_NAME || 'express-example',
  createDefaultLogger: true,
});

const express = require('express');
const app = express();
const logger = getLogger();

app.get('/', (req, res) => {
  logger.info('GET /');
  res.json({ ok: true });
});

app.get('/hello', (req, res) => {
  logger.info('GET /hello', { name: req.query.name });
  res.json({ message: `Hello, ${req.query.name || 'World'}!` });
});

app.listen(3000, () => {
  logger.info('Express listening on http://localhost:3000');
});
