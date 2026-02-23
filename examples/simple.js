/**
 * Minimal APM: init once at the top, then run your app.
 * Run: node examples/simple.js
 * Set env or pass collectorUrl/serviceName to initAPM.
 */
const { initAPM } = require('../src/index.js');

initAPM({
  collectorUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
  serviceName: process.env.OTEL_SERVICE_NAME || 'simple-example',
});

const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});
server.listen(8080, () => console.log('Listening on http://localhost:8080'));
