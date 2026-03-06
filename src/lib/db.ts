import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('bots.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS bots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'stopped',
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id TEXT NOT NULL,
    action TEXT NOT NULL,
    confidence REAL,
    reasoning TEXT,
    result TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots (id)
  );
`);

export default db;
