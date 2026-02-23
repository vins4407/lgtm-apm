'use strict';

/**
 * Require this with -r lgtm-apm/register.js to auto-init APM from env vars.
 * Example: node -r lgtm-apm/register.js server.js
 */
const { initAPM } = require('./index.js');
initAPM({});
