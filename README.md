# lgtm-apm

**One-line OpenTelemetry APM for the LGTM stack** (Loki, Grafana, Tempo, Mimir). Point your Node.js app at an OTLP collector URL (e.g. Grafana Alloy) and get automatic tracing—and optional metrics and logs—with no vendor lock-in.

- **Install** → **Import** → **Call `initAPM({ collectorUrl, serviceName })`** → APM is on.

Works with [Grafana Alloy](https://grafana.com/docs/alloy/latest/), any OTLP HTTP endpoint (e.g. Tempo, SigNoz, Jaeger), and supports the standard `X-Scope-OrgID` header for Grafana multi-tenancy.

## Install

```bash
npm install lgtm-apm
# or
pnpm add lgtm-apm
```

## Quick start

Call `initAPM` **before** any other application code (e.g. at the top of your entry file or in a dedicated `instrumentation.js` that runs first):

```javascript
const { initAPM } = require('lgtm-apm');

initAPM({
  collectorUrl: 'http://alloy-traces-otlp.grafana-monitoring.svc.cluster.local:4318',
  serviceName: 'my-service',
});

// Optional: use a trace-aware logger (adds trace_id/span_id to every log)
const { createLogger, getLogger } = require('lgtm-apm');
initAPM({ collectorUrl: '...', serviceName: 'my-service', createDefaultLogger: true });
const logger = getLogger();
logger.info('Request received');
```

That’s it. HTTP, DB, and other supported libraries are auto-instrumented.

## Configuration

| Option | Env fallback | Default | Description |
|--------|----------------|--------|-------------|
| `collectorUrl` | `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTLP HTTP base URL (e.g. Alloy OTLP HTTP). |
| `serviceName` | `OTEL_SERVICE_NAME` / `npm_package_name` | `unknown-service` | Service name in traces. |
| `serviceVersion` | `OTEL_SERVICE_VERSION` / `npm_package_version` | `1.0.0` | Service version. |
| `environment` | `OTEL_DEPLOYMENT_ENVIRONMENT` / `NODE_ENV` | `development` | Deployment environment. |
| `orgId` | `OTEL_ORG_ID` | `tenant1` | Sent as `X-Scope-OrgID` (Grafana multi-tenancy). |
| `additionalHeaders` | — | `{}` | Extra headers for the OTLP exporter. |
| `enableMetrics` | `OTEL_METRICS_ENABLED` | `true` | Enable OTLP metrics export. |
| `enableLogs` | — | `false` | Enable OTLP logs (needs optional deps). |
| `createDefaultLogger` | — | `false` | Create a trace-aware logger; use with `getLogger()`. |
| `attributes` | — | `{}` | Custom resource attributes. |

## Environment-only setup

You can rely entirely on env vars and only require the module:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://alloy:4318
export OTEL_SERVICE_NAME=my-app
node -r lgtm-apm/register.js server.js
```

`register.js` runs `initAPM({})` so all settings come from the env vars above.

## Shutdown

```javascript
const { shutdown } = require('lgtm-apm');
await shutdown();
```

## Examples

- `examples/simple.js` — minimal HTTP server with APM
- `examples/with-express.js` — Express app with APM and trace-aware logger

From repo root: `node examples/simple.js` (set `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME` if needed).

## License

MIT