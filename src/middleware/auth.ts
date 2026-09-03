import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { eq } from 'drizzle-orm'
import { sessions, users } from '../db/schema.js'
import type { AppEnv } from '../platform/types.js'

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const config = c.get('config')

  // Bypass auth if PROXY_AUTH is enabled
  if (config.proxyAuth) {
    return next()
  }

  // Exempt login and setup endpoints from session validation
  const path = c.req.path
  if (path === '/api/auth/login' || path === '/auth/login' || path.endsWith('/auth/login') ||
      path.startsWith('/api/auth/setup') || path.includes('/auth/setup') ||
      path === '/api/config') {
    return next()
  }

  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = c.get('db')
  const now = new Date()
  const [row] = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))

  if (!row || row.session.expiresAt <= now) {
    if (row) {
      await db.delete(sessions).where(eq(sessions.id, sessionId))
    }
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', row.user)
  c.set('session', row.session)

  return next()
}
