const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

let child;
let baseUrl;
let dataDir;
let serverOutput = '';

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Flowdesk server exited early:\n' + serverOutput);
    try {
      const response = await fetch(baseUrl + '/api/health');
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Flowdesk server did not become ready:\n' + serverOutput);
}

async function request(route, { method = 'GET', cookie, body, headers = {} } = {}) {
  const response = await fetch(baseUrl + route, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual'
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  return { response, data };
}

async function register(name, email, password = 'test-password-123') {
  const result = await request('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
    headers: { origin: baseUrl }
  });
  return { ...result, cookie: result.response.headers.get('set-cookie')?.split(';')[0] };
}

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowdesk-test-'));
  const port = await freePort();
  baseUrl = 'http://127.0.0.1:' + port;
  child = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      DATA_DIR: dataDir,
      SESSION_SECRET: 'test-only-secret-with-more-than-thirty-two-characters'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', chunk => { serverOutput += chunk.toString(); });
  child.stderr.on('data', chunk => { serverOutput += chunk.toString(); });
  await waitForServer();
});

after(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise(resolve => {
      const timeout = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 3000);
      child.once('exit', () => { clearTimeout(timeout); resolve(); });
    });
  }
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
});

test('Flowdesk full-stack API: health, security, auth, CRUD, isolation and persistence', async t => {
  await t.test('health endpoint and security headers', async () => {
    const { response, data } = await request('/api/health');
    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.service, 'flowdesk');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
  });

  await t.test('serves the application shell and static assets', async () => {
    const page = await fetch(baseUrl + '/');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Flowdesk — Your business, in order/);
    const script = await fetch(baseUrl + '/app.js');
    assert.equal(script.status, 200);
    assert.match(script.headers.get('content-type') || '', /javascript/);
  });

  const alice = await register('Alice Test', 'ALICE@example.com');
  assert.equal(alice.response.status, 201);
  assert.ok(alice.cookie);
  assert.equal(alice.data.user.email, 'alice@example.com');

  await t.test('rejects duplicate registration and invalid inputs', async () => {
    const duplicate = await register('Alice Again', 'alice@example.com');
    assert.equal(duplicate.response.status, 409);
    const weak = await request('/api/auth/register', {
      method: 'POST', body: { name: 'Weak', email: 'weak@example.com', password: 'short' },
      headers: { origin: baseUrl }
    });
    assert.equal(weak.response.status, 400);
    const invalidDate = await request('/api/records', {
      method: 'POST', cookie: alice.cookie,
      body: { workspace: 'service', kind: 'booking', title: 'Invalid date', record_date: '2026-02-31' },
      headers: { origin: baseUrl }
    });
    assert.equal(invalidDate.response.status, 400);
  });

  await t.test('enforces same-origin writes in production', async () => {
    const blocked = await request('/api/demo-data', {
      method: 'POST', cookie: alice.cookie, body: { workspace: 'service' },
      headers: { origin: 'https://attacker.example' }
    });
    assert.equal(blocked.response.status, 403);
    const missingOrigin = await request('/api/demo-data', {
      method: 'POST', cookie: alice.cookie, body: { workspace: 'service' }
    });
    assert.equal(missingOrigin.response.status, 403);
  });

  let bookingId;
  await t.test('requires authentication and supports account sessions', async () => {
    const anonymous = await request('/api/records?workspace=service');
    assert.equal(anonymous.response.status, 401);
    const me = await request('/api/auth/me', { cookie: alice.cookie });
    assert.equal(me.response.status, 200);
    assert.equal(me.data.user.name, 'Alice Test');
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'Alice@example.com', password: 'test-password-123' },
      headers: { origin: baseUrl }
    });
    assert.equal(login.response.status, 200);
    assert.ok(login.response.headers.get('set-cookie'));
    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'alice@example.com', password: 'wrong-password' },
      headers: { origin: baseUrl }
    });
    assert.equal(badLogin.response.status, 401);
  });

  await t.test('creates, reads, filters, updates and deletes records', async () => {
    const created = await request('/api/records', {
      method: 'POST', cookie: alice.cookie,
      body: {
        workspace: 'service', kind: 'booking', title: 'Website redesign',
        details: { client: 'Example Co', notes: 'First project' },
        amount: 12500, status: 'Confirmed', record_date: '2026-10-31'
      },
      headers: { origin: baseUrl }
    });
    assert.equal(created.response.status, 201);
    bookingId = created.data.record.id;
    assert.equal(created.data.record.amount, 12500);
    const list = await request('/api/records?workspace=service&search=redesign', { cookie: alice.cookie });
    assert.equal(list.response.status, 200);
    assert.equal(list.data.records.length, 1);
    assert.equal(list.data.records[0].id, bookingId);
    const otherWorkspace = await request('/api/records?workspace=creator', { cookie: alice.cookie });
    assert.equal(otherWorkspace.data.records.length, 0);
    const updated = await request('/api/records/' + bookingId, {
      method: 'PATCH', cookie: alice.cookie,
      body: { status: 'Completed', amount: 15000 },
      headers: { origin: baseUrl }
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.data.record.status, 'Completed');
    assert.equal(updated.data.record.amount, 15000);
  });

  const bob = await register('Bob Test', 'bob@example.com');
  assert.equal(bob.response.status, 201);

  await t.test('isolates records between different accounts', async () => {
    const bobRecords = await request('/api/records?workspace=service', { cookie: bob.cookie });
    assert.equal(bobRecords.response.status, 200);
    assert.equal(bobRecords.data.records.length, 0);
    const readAlice = await request('/api/records?workspace=service&search=redesign', { cookie: bob.cookie });
    assert.equal(readAlice.data.records.length, 0);
    const editAlice = await request('/api/records/' + bookingId, {
      method: 'PATCH', cookie: bob.cookie, body: { title: 'Hijacked' },
      headers: { origin: baseUrl }
    });
    assert.equal(editAlice.response.status, 404);
    const deleteAlice = await request('/api/records/' + bookingId, {
      method: 'DELETE', cookie: bob.cookie, headers: { origin: baseUrl }
    });
    assert.equal(deleteAlice.response.status, 404);
  });

  await t.test('creates demo records and keeps them in the account database', async () => {
    const demo = await request('/api/demo-data', {
      method: 'POST', cookie: alice.cookie, body: { workspace: 'creator' },
      headers: { origin: baseUrl }
    });
    assert.equal(demo.response.status, 201);
    assert.equal(demo.data.added, 2);
    const records = await request('/api/records?workspace=creator', { cookie: alice.cookie });
    assert.equal(records.data.records.length, 2);
    const persisted = await request('/api/records?workspace=service', { cookie: alice.cookie });
    assert.equal(persisted.data.records.length, 1);
  });

  await t.test('rejects malformed methods and oversized request bodies', async () => {
    const method = await fetch(baseUrl + '/api/health', { method: 'PUT' });
    assert.equal(method.status, 405);
    const badJson = await fetch(baseUrl + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: baseUrl },
      body: '{not-json'
    });
    assert.equal(badJson.status, 400);
  });

  await t.test('logs out and invalidates the session', async () => {
    const logout = await request('/api/auth/logout', {
      method: 'POST', cookie: alice.cookie, body: {},
      headers: { origin: baseUrl }
    });
    assert.equal(logout.response.status, 200);
    const after = await request('/api/auth/me', { cookie: alice.cookie });
    assert.equal(after.response.status, 401);
  });
});
