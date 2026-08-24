/// <reference types="@cloudflare/workers-types" />
import { createApp } from './app.js'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './db/schema.js'
import type { AppDatabase } from './platform/types.js'

/**
 * Cloudflare Pages Function entry point.
 *
 * D1 bindings and environment variables are injected per-request
 * via the platformInit callback, before auth middleware runs.
 */

type CloudflareBindings = {
  DB: D1Database
  PROXY_AUTH?: string
}

const app = createApp((app) => {
  app.use('*', async (c, next) => {
    const env = (c.env as unknown) as CloudflareBindings
    // Type assertion: D1 drizzle has an identical query API to better-sqlite3
    c.set('db', drizzle(env.DB, { schema }) as unknown as AppDatabase)
    c.set('config', {
      proxyAuth: env.PROXY_AUTH === 'true',
      isProduction: true,
    })
    return next()
  })
})

export default app
