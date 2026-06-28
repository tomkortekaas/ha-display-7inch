// src/lib/db.ts
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let db: Database.Database | null = null

function initDb() {
  if (db) return db

  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), '.data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  db = new Database(path.join(dataDir, 'app.db'))

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id                TEXT PRIMARY KEY,
      created_at        INTEGER NOT NULL,
      filter_json       TEXT NOT NULL,
      asset_ids         TEXT NOT NULL,
      current_idx       INTEGER NOT NULL DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'active',
      beoordeeld_tag_id TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS decisions (
      session_id  TEXT NOT NULL,
      asset_id    TEXT NOT NULL,
      action      TEXT NOT NULL,
      decided_at  INTEGER NOT NULL,
      PRIMARY KEY (session_id, asset_id)
    );

    CREATE TABLE IF NOT EXISTS asset_stats (
      period_type  TEXT NOT NULL,
      period_key   TEXT NOT NULL,
      period_label TEXT NOT NULL DEFAULT '',
      total        INTEGER NOT NULL DEFAULT 0,
      reviewed     INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (period_type, period_key)
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_scans (
      id              TEXT PRIMARY KEY,
      created_at      INTEGER NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending',
      total_assets    INTEGER NOT NULL DEFAULT 0,
      processed       INTEGER NOT NULL DEFAULT 0,
      options_json    TEXT NOT NULL DEFAULT '{}',
      error           TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS ah_recipes (
      id               TEXT PRIMARY KEY,
      title            TEXT NOT NULL DEFAULT '',
      duration         INTEGER NOT NULL DEFAULT 0,
      servings         INTEGER NOT NULL DEFAULT 4,
      image_url        TEXT NOT NULL DEFAULT '',
      detail_json      TEXT NOT NULL DEFAULT '',
      detail_synced_at INTEGER NOT NULL DEFAULT 0,
      updated_at       INTEGER NOT NULL,
      last_seen_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ah_recipe_lists (
      list_key   TEXT NOT NULL,
      recipe_id  TEXT NOT NULL,
      position   INTEGER NOT NULL,
      synced_at  INTEGER NOT NULL,
      PRIMARY KEY (list_key, recipe_id)
    );
  `)

  // Migrations
  const aiScanCols = (db.prepare("PRAGMA table_info(ai_scans)").all() as any[]).map(c => c.name)
  if (!aiScanCols.includes('current_page')) {
    db.exec("ALTER TABLE ai_scans ADD COLUMN current_page INTEGER NOT NULL DEFAULT 0")
  }
  if (!aiScanCols.includes('asset_ids_json')) {
    db.exec("ALTER TABLE ai_scans ADD COLUMN asset_ids_json TEXT NOT NULL DEFAULT '[]'")
  }
  if (!aiScanCols.includes('skipped')) {
    db.exec("ALTER TABLE ai_scans ADD COLUMN skipped INTEGER NOT NULL DEFAULT 0")
  }

  // Migrations — voeg ontbrekende kolommen toe aan bestaande tabellen
  const existingCols = (db.prepare("PRAGMA table_info(sessions)").all() as any[]).map(c => c.name)
  if (!existingCols.includes('beoordeeld_tag_id')) {
    db.exec("ALTER TABLE sessions ADD COLUMN beoordeeld_tag_id TEXT NOT NULL DEFAULT ''")
  }

  const decisionCols = (db.prepare("PRAGMA table_info(decisions)").all() as any[]).map(c => c.name)
  if (!decisionCols.includes('extra_tag')) {
    db.exec("ALTER TABLE decisions ADD COLUMN extra_tag TEXT NOT NULL DEFAULT ''")
  }

  return db
}

export default new Proxy({} as Database.Database, {
  get(target, prop) {
    const instance = initDb()
    return (instance as any)[prop]
  }
}) as any as Database.Database
