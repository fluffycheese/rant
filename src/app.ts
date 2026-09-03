import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth.js'
import type { AppEnv } from './platform/types.js'
import authRoute      from './routes/auth.js'
import profilesRoute  from './routes/profiles.js'
import sitesRoute     from './routes/sites.js'
import racksRoute     from './routes/racks.js'
import devicesRoute   from './routes/devices.js'
import portsRoute     from './routes/ports.js'
import linksRoute     from './routes/cableLinks.js'
import usersRoute     from './routes/users.js'
import templatesRoute from './routes/templates.js'
import statsRoute     from './routes/stats.js'
import exportRoute    from './routes/export.js'
import importRoute    from './routes/import.js'
import demoRoute      from './routes/demo.js'

/**
 * Create the shared Hono application.
 *
 * @param platformInit — callback to register platform-specific middleware
 *   (db injection, config injection) BEFORE the auth middleware runs.
 */
export function createApp(platformInit: (app: Hono<AppEnv>) => void) {
  const app = new Hono<AppEnv>()

  app.use('*', logger())
  // Allow Vite dev server to call the API during development
  app.use('/api/*', cors({ origin: 'http://localhost:5173', credentials: true }))

  // Platform-specific setup — must run before auth so c.var.db and c.var.config are available
  platformInit(app)

  // Global error handler
  app.onError((err, c) => {
    console.error(err)
    if (err.name === 'ZodError') {
      return c.json({ error: 'Validation error', details: JSON.parse(err.message) }, 422)
    }
    return c.json({ error: err.message, cause: err.cause ? String(err.cause) : undefined }, 500)
  })

  // Apply authentication middleware to all /api/* routes (exempts /api/auth/login and /api/auth/setup)
  app.use('/api/*', authMiddleware)

  // ── API routes ──────────────────────────────────────────────────────────────
  const api = new Hono<AppEnv>()
  api.route('/auth',      authRoute)
  api.route('/profiles',  profilesRoute)
  api.route('/sites',     sitesRoute)
  api.route('/racks',     racksRoute)
  api.route('/devices',   devicesRoute)
  api.route('/ports',     portsRoute)
  api.route('/links',     linksRoute)
  api.route('/users',     usersRoute)
  api.route('/templates', templatesRoute)
  api.route('/stats',     statsRoute)
  api.route('/export',    exportRoute)
  api.route('/import',    importRoute)
  api.route('/demo',      demoRoute)
  
  app.get('/api/config', (c) => {
    return c.json(c.get('config'))
  })

  app.route('/api', api)

  return app
}
