// server/db.js
// Гибридный слой базы данных (SQLite локально + PostgreSQL при наличии DATABASE_URL)
const path = require('path');
const fs = require('fs');

let isPostgres = Boolean(process.env.DATABASE_URL);
let sqliteDb = null;
let pgPool = null;

const dbDataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDataDir)) {
  fs.mkdirSync(dbDataDir, { recursive: true });
}

if (isPostgres) {
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
  console.log('[DB] Подключено к PostgreSQL');
} else {
  const Database = require('better-sqlite3');
  const sqliteFile = path.join(dbDataDir, 'phonedrop.sqlite');
  sqliteDb = new Database(sqliteFile);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  console.log(`[DB] Подключено к SQLite: ${sqliteFile}`);
}

/**
 * Преобразует позиционные параметры (? в $1, $2) для PostgreSQL
 */
function normalizeQuery(sql) {
  if (!isPostgres) return sql;
  let paramIdx = 1;
  return sql.replace(/\?/g, () => `$${paramIdx++}`);
}

async function query(sql, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(normalizeQuery(sql), params);
    return res.rows;
  } else {
    const stmt = sqliteDb.prepare(sql);
    return stmt.all(...params);
  }
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(normalizeQuery(sql), params);
    return { changes: res.rowCount, lastInsertRowid: res.rows[0]?.id || null };
  } else {
    const stmt = sqliteDb.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }
}

/**
 * Инициализация структуры таблиц
 */
async function initSchema() {
  const isPg = isPostgres;

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id ${isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      telegram_id TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      avatar_url TEXT,
      coins INTEGER NOT NULL DEFAULT 250,
      max_inventory INTEGER NOT NULL DEFAULT 50,
      equipped_phone_id INTEGER,
      avatar_frame TEXT NOT NULL DEFAULT 'default',
      profile_bg TEXT NOT NULL DEFAULT 'default',
      referrer_id INTEGER,
      referral_earnings INTEGER NOT NULL DEFAULT 0,
      is_public INTEGER NOT NULL DEFAULT 1,
      created_at ${isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `;

  const createPhonesTable = `
    CREATE TABLE IF NOT EXISTS phones (
      id ${isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      country TEXT NOT NULL,
      country_code TEXT NOT NULL,
      formatted_number TEXT UNIQUE NOT NULL,
      raw_national_number TEXT NOT NULL,
      score INTEGER NOT NULL,
      category TEXT NOT NULL,
      tags TEXT NOT NULL,
      rarity TEXT NOT NULL,
      base_price INTEGER NOT NULL,
      series TEXT NOT NULL DEFAULT '2026',
      status TEXT NOT NULL DEFAULT 'available',
      owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      first_discovered_at ${isPg ? 'TIMESTAMPTZ' : 'DATETIME'},
      first_owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at ${isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `;

  const createPhoneHistoryTable = `
    CREATE TABLE IF NOT EXISTS phone_history (
      id ${isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      phone_id INTEGER NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      from_user_id INTEGER,
      to_user_id INTEGER,
      price INTEGER,
      created_at ${isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `;

  const createMarketListingsTable = `
    CREATE TABLE IF NOT EXISTS market_listings (
      id ${isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      phone_id INTEGER UNIQUE NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
      seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      price INTEGER NOT NULL,
      fee_amount INTEGER NOT NULL,
      seller_revenue INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at ${isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `;

  const createCosmeticsTable = `
    CREATE TABLE IF NOT EXISTS user_cosmetics (
      id ${isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      purchased_at ${isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      UNIQUE(user_id, item_id)
    )
  `;

  const createReferralsTable = `
    CREATE TABLE IF NOT EXISTS referrals (
      id ${isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bonus_coins INTEGER NOT NULL DEFAULT 150,
      created_at ${isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      UNIQUE(referred_id)
    )
  `;

  const createStarsOrdersTable = `
    CREATE TABLE IF NOT EXISTS stars_orders (
      id ${isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stars_amount INTEGER NOT NULL,
      coins_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at ${isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `;

  const createOperationsLogTable = `
    CREATE TABLE IF NOT EXISTS operations_log (
      id ${isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      op_key TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at ${isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `;

  if (isPg) {
    await pgPool.query(createUsersTable);
    await pgPool.query(createPhonesTable);
    await pgPool.query(createPhoneHistoryTable);
    await pgPool.query(createMarketListingsTable);
    await pgPool.query(createCosmeticsTable);
    await pgPool.query(createReferralsTable);
    await pgPool.query(createStarsOrdersTable);
    await pgPool.query(createOperationsLogTable);
  } else {
    sqliteDb.exec(createUsersTable);
    sqliteDb.exec(createPhonesTable);
    sqliteDb.exec(createPhoneHistoryTable);
    sqliteDb.exec(createMarketListingsTable);
    sqliteDb.exec(createCosmeticsTable);
    sqliteDb.exec(createReferralsTable);
    sqliteDb.exec(createStarsOrdersTable);
    sqliteDb.exec(createOperationsLogTable);

    // Добавляем недостающие колонки в существующие таблицы, если база уже создана
    try {
      sqliteDb.exec('ALTER TABLE users ADD COLUMN referrer_id INTEGER');
    } catch {}
    try {
      sqliteDb.exec('ALTER TABLE users ADD COLUMN referral_earnings INTEGER NOT NULL DEFAULT 0');
    } catch {}
  }

  console.log('[DB] Структура базы данных проверена и готова.');
}

module.exports = {
  isPostgres,
  query,
  queryOne,
  run,
  initSchema,
  sqliteDb,
  pgPool
};
