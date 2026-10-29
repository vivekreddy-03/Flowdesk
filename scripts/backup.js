const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.DB_PATH || path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'flowdesk.sqlite');
if (!fs.existsSync(dbPath)) {
  console.error('Database not found:', dbPath);
  process.exit(1);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = process.argv[2] || path.join(path.dirname(dbPath), `flowdesk-backup-${stamp}.sqlite`);
const db = new DatabaseSync(dbPath);
try {
  db.exec(`VACUUM INTO '${path.resolve(output).replace(/'/g, "''")}'`);
  const check = new DatabaseSync(output, { readOnly: true });
  const integrity = check.prepare('PRAGMA integrity_check').get();
  check.close();
  if (integrity.integrity_check !== 'ok') throw new Error('Backup integrity check failed');
  console.log('Backup created and verified:', output);
} finally {
  db.close();
}
