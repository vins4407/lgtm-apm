'use strict';

/**
 * OpenTelemetry SDK setup: traces, optional metrics, optional logs.
 * Exports to OTLP HTTP (Alloy accepts both gRPC and HTTP; HTTP is simpler for URL config).
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} = require('@opentelemetry/semantic-conventions');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

let sdk = null;
let loggerInstance = null;

/**
 * Normalize collector URL: ensure no trailing slash; exporters append /v1/traces, /v1/metrics.
 * @param {string} url
 * @returns {string}
 */
function baseUrl(url) {
  return (url || '').replace(/\/$/, '');
}

/**
 * Build OTLP headers (e.g. X-Scope-OrgID for Grafana multi-tenancy).
 * @param {object} config
 * @returns {Record<string, string>}
 */
function buildHeaders(config) {
  const headers = { ...(config.additionalHeaders || {}) };
  const orgId = config.orgId ?? process.env.OTEL_ORG_ID ?? 'tenant1';
  if (orgId) headers['X-Scope-OrgID'] = orgId;
  return headers;
}

/**
 * Initialize APM: traces + optional metrics. Optionally enable logs (requires extra deps).
 * Call this once at app startup, before any other imports that should be instrumented.
 *
 * @param {{
 *   collectorUrl: string;
 *   serviceName?: string;
 *   serviceVersion?: string;
 *   environment?: string;
 *   orgId?: string;
 *   additionalHeaders?: Record<string, string>;
 *   enableMetrics?: boolean;
 *   enableLogs?: boolean;
 *   createDefaultLogger?: boolean;
 *   attributes?: Record<string, string | number | boolean>;
 * }} config
 * @returns {{ sdk: import('@opentelemetry/sdk-node').NodeSDK; shutdown: () => Promise<void> }}
 */
function initAPM(config) {
  const collectorUrl = config.collectorUrl ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';
  const base = baseUrl(collectorUrl);
  const serviceName = config.serviceName ?? process.env.OTEL_SERVICE_NAME ?? process.env.npm_package_name ?? 'unknown-service';
  const serviceVersion = config.serviceVersion ?? process.env.OTEL_SERVICE_VERSION ?? process.env.npm_package_version ?? '1.0.0';
  const environment = config.environment ?? process.env.OTEL_DEPLOYMENT_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';
  const enableMetrics = config.enableMetrics ?? (process.env.OTEL_METRICS_ENABLED !== 'false');
  const enableLogs = config.enableLogs === true;
  const headers = buildHeaders(config);

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
    ...(config.attributes || {}),
  });

  const traceExporter = new OTLPTraceExporter({
    url: base.endsWith('/v1/traces') ? base : `${base}/v1/traces`,
    headers,
  });

  const instrumentations = [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ];

  const sdkConfig = {
    resource,
    traceExporter,
    instrumentations,
  };

  if (enableMetrics) {
    try {
      const metricExporter = new OTLPMetricExporter({
        url: base.endsWith('/v1/metrics') ? base : `${base}/v1/metrics`,
        headers,
      });
      sdkConfig.metricReader = new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 10000,
      });
    } catch (e) {
      // Optional metrics export
    }
  }

  if (enableLogs) {
    try {
      const { BatchLogRecordProcessor, LoggerProvider } = require('@opentelemetry/sdk-logs');
      const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
      const { logs } = require('@opentelemetry/api-logs');
      const logExporter = new OTLPLogExporter({
        url: base.endsWith('/v1/logs') ? base : `${base}/v1/logs`,
        headers,
      });
      const loggerProvider = new LoggerProvider({ resource });
      loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
      logs.setGlobalLoggerProvider(loggerProvider);
    } catch (e) {
      // Optional logs: @opentelemetry/exporter-logs-otlp-http / api-logs may not be installed
    }
  }

  if (sdk) {
    sdk.shutdown().catch(() => undefined);
  }

  const createDefaultLogger = config.createDefaultLogger === true;
  if (createDefaultLogger) {
    const { createLogger } = require('./logger.js');
    setLogger(createLogger({ serviceName, environment }));
  }

  sdk = new NodeSDK(sdkConfig);
  sdk.start();

  if (typeof process !== 'undefined') {
    process.on('SIGTERM', () => {
      shutdown().finally(() => process.exit(0));
    });
  }

  return { sdk, shutdown };
}

/**
 * Graceful shutdown of the SDK.
 * @returns {Promise<void>}
 */
async function shutdown() {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}

/**
 * Set the optional trace-aware logger (from createLogger). Used by getLogger().
 * @param {import('./logger.js').Logger} logger
 */
function setLogger(logger) {
  loggerInstance = logger;
}

/**
 * Get the trace-aware logger if one was set via setLogger(createLogger(...)).
 * @returns {import('./logger.js').Logger | undefined}
 */
function getLogger() {
  return loggerInstance;
}

module.exports = {
  initAPM,
  shutdown,
  setLogger,
  getLogger,
};
