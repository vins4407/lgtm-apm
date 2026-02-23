const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src');
const dist = path.join(__dirname, 'dist');

if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

for (const name of ['index.js', 'instrumentation.js', 'logger.js', 'register.js']) {
  fs.copyFileSync(path.join(src, name), path.join(dist, name));
}

console.log('lgtm-apm: built dist/');
