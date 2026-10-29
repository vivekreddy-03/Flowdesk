const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('production startup refuses missing or weak session secret', () => {
  const result = spawnSync(process.execPath, ['-e', "process.env.NODE_ENV='production'; delete process.env.SESSION_SECRET; require('./src/server')"], {
    cwd: process.cwd(),
    env: {...process.env, NODE_ENV:'production', SESSION_SECRET:''},
    encoding:'utf8',
    timeout:5000
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SESSION_SECRET/);
});
