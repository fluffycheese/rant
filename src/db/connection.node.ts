import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import * as schema from './schema.js'

/**
 * Create a better-sqlite3 backed Drizzle instance.
 * Ensures the data directory exists and sets WAL + FK pragmas.
 */
export function createNodeDb(url: string) {
  mkdirSync(dirname(url), { recursive: true })

  const sqlite = new Database(url)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  return drizzle(sqlite, { schema })
}

/**
 * Run Drizzle migrations. Idempotent — safe to call on every startup.
 */
export function runMigrations(db: ReturnType<typeof createNodeDb>, folder: string) {
  migrate(db, { migrationsFolder: folder })
}
