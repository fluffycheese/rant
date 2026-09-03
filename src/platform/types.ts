import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema.js'

/**
 * Shared database type for all deployment targets.
 *
 * Uses BetterSQLite3Database as the canonical type for full query-builder
 * type safety. The D1 driver has an identical API at runtime — the CF
 * entry point type-asserts its drizzle instance to this type.
 */
export type AppDatabase = BetterSQLite3Database<typeof schema>

export type AppConfig = {
  proxyAuth: boolean
  isProduction: boolean
  demoMode: boolean
  cronSecret?: string
}

export type AppEnv = {
  Variables: {
    db: AppDatabase
    config: AppConfig
    user?: typeof schema.users.$inferSelect
    session?: typeof schema.sessions.$inferSelect
  }
}
