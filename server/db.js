const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/bills.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

const SEED_BILLS = [
  'Mortgage',
  'Car Note',
  'Student Loans',
  'Verizon',
  'Lawn Care',
  'Tesla FSD',
  'Solar Panel',
  'Rooms To Go',
  'Gary Sinise Foundation',
  'Water',
  'Spectrum',
  'Vivint Loan',
  'Vivint',
  'Culligan',
  'Exterminator/Lawn Care',
  'LinkedIn',
  'Barkbox',
  'Notion',
  'Teco',
  'ChatGPT',
  'Audible',
  'Proton',
  'Tesla Premium Connectivity',
  'TP Link',
  'Citi CC',
  'Chase CC',
  'Apple Credit Card',
];

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS current_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      paid INTEGER NOT NULL DEFAULT 0,
      template_bill_id INTEGER REFERENCES template_bills(id)
    );

    CREATE TABLE IF NOT EXISTS summary (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      bank_balance REAL NOT NULL DEFAULT 0,
      paychecks_remaining REAL NOT NULL DEFAULT 0,
      paycheck_amount REAL NOT NULL DEFAULT 0,
      move_to_savings REAL NOT NULL DEFAULT 0,
      savings_balance REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS passkeys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      device_name TEXT NOT NULL DEFAULT 'Unknown device',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrate: add autopay and due_day columns if they don't exist yet
  try { db.exec('ALTER TABLE template_bills ADD COLUMN autopay INTEGER NOT NULL DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE template_bills ADD COLUMN due_day INTEGER'); } catch {}
  try { db.exec('ALTER TABLE current_bills ADD COLUMN autopay INTEGER NOT NULL DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE current_bills ADD COLUMN due_day INTEGER'); } catch {}
  try { db.exec('ALTER TABLE current_bills ADD COLUMN skipped INTEGER NOT NULL DEFAULT 0'); } catch {}

  // Short-lived WebAuthn challenges — avoids relying on session cookies surviving
  // the OS-level biometric handoff on mobile browsers
  db.exec(`
    CREATE TABLE IF NOT EXISTS webauthn_challenges (
      token TEXT PRIMARY KEY,
      challenge TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Payment history — append-only audit log of every paid/unpaid toggle
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER,
      bill_name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      action TEXT NOT NULL CHECK (action IN ('paid', 'unpaid')),
      month_key TEXT NOT NULL,
      occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Ensure the single summary row exists
  db.prepare('INSERT OR IGNORE INTO summary (id) VALUES (1)').run();

  // Seed template and current bills if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM template_bills').get();
  if (count.c === 0) {
    const insertTemplate = db.prepare(
      'INSERT INTO template_bills (name, amount, sort_order) VALUES (?, 0, ?)'
    );
    const insertCurrent = db.prepare(
      'INSERT INTO current_bills (name, amount, paid, template_bill_id) VALUES (?, 0, 0, ?)'
    );

    db.transaction(() => {
      SEED_BILLS.forEach((name, i) => {
        const result = insertTemplate.run(name, i);
        insertCurrent.run(name, result.lastInsertRowid);
      });
    })();
  }
}

module.exports = { db, initDb };
