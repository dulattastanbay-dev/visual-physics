// База данных заявок на встроенном SQLite (node:sqlite).
// Файл базы: server/data/leads.db (создаётся автоматически).

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(join(DATA_DIR, 'leads.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    phone         TEXT NOT NULL,
    school        TEXT,
    role          TEXT,
    message       TEXT,
    source        TEXT,
    user_agent    TEXT,
    ip            TEXT,
    telegram_sent INTEGER DEFAULT 0,
    created_at    TEXT NOT NULL
  )
`);

export function insertLead(l) {
  const stmt = db.prepare(`
    INSERT INTO leads (name, phone, school, role, message, source, user_agent, ip, telegram_sent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    l.name,
    l.phone,
    l.school || null,
    l.role || null,
    l.message || null,
    l.source || null,
    l.user_agent || null,
    l.ip || null,
    l.telegram_sent ? 1 : 0,
    new Date().toISOString()
  );
  return info.lastInsertRowid;
}

export function markTelegramSent(id) {
  db.prepare('UPDATE leads SET telegram_sent = 1 WHERE id = ?').run(id);
}

export function getLeads(limit = 500) {
  return db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT ?').all(limit);
}

export function countLeads() {
  return db.prepare('SELECT COUNT(*) AS c FROM leads').get().c;
}
