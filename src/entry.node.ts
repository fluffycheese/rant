try { process.loadEnvFile() } catch (e) {}

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app.js'
import { createNodeDb, runMigrations } from './db/connection.node.js'

// ── Database ──────────────────────────────────────────────────────────────────
const dbUrl = process.env.DATABASE_URL ?? './data/rant.db'
const db = createNodeDb(dbUrl)
runMigrations(db, './drizzle')
console.log(`Database ready: ${dbUrl}`)

// ── App ───────────────────────────────────────────────────────────────────────
const app = createApp((app) => {
  // Inject db and config into every request — runs before auth middleware
  app.use('*', async (c, next) => {
    c.set('db', db)
    c.set('config', {
      proxyAuth: process.env.PROXY_AUTH === 'true',
      isProduction: process.env.NODE_ENV === 'production',
      demoMode: process.env.DEMO_MODE === 'true',
      cronSecret: process.env.CRON_SECRET,
    })
    return next()
  })
})

import fs from 'node:fs'

// ── Serve React SPA in production ─────────────────────────────────────────────
if (fs.existsSync('./dist/public')) {
  app.use('/*', serveStatic({ root: './dist/public' }))
  app.get('/*', serveStatic({ path: './dist/public/index.html' }))
}

// ── Listen ────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3001)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`RANT running → http://localhost:${info.port}`)
})
