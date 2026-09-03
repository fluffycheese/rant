import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { users, sessions } from '../db/schema.js'
import { hashPassword, verifyPassword } from '../platform/crypto.js'
import type { AppEnv } from '../platform/types.js'

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const SetupSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
})

const app = new Hono<AppEnv>()

// POST /setup — create the first admin user (only works when 0 users exist)
app.post('/setup', async (c) => {
  const db = c.get('db')
  const existing = await db.select({ id: users.id }).from(users).limit(1)
  if (existing.length > 0) {
    return c.json({ error: 'Setup already complete. Users exist.' }, 403)
  }

  const body = await c.req.json()
  const input = SetupSchema.parse(body)
  const passwordHash = await hashPassword(input.password)

  const [user] = await db.insert(users).values({
    username: input.username,
    passwordHash,
  }).returning({
    id: users.id,
    username: users.username,
  })

  return c.json({ ok: true, user }, 201)
})

// GET /setup/status — check if setup is needed
app.get('/setup/status', async (c) => {
  const db = c.get('db')
  const config = c.get('config')
  const existing = await db.select({ id: users.id }).from(users).limit(1)
  
  // Auto-seed demo environment if empty
  if (existing.length === 0 && config.demoMode) {
    const { resetDemoEnvironment } = await import('../services/demoService.js')
    await resetDemoEnvironment(db)
    return c.json({ needsSetup: false })
  }

  return c.json({ needsSetup: existing.length === 0 })
})

// POST /login (checks username/password against users table, creates session, sets cookie)
app.post('/login', async (c) => {
  const db = c.get('db')
  const config = c.get('config')
  const body = await c.req.json()
  const input = LoginSchema.parse(body)

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, input.username))

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return c.json({ error: 'Invalid username or password' }, 401)
  }

  // Session duration: 7 days
  const sessionDurationMs = 7 * 24 * 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + sessionDurationMs)

  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      expiresAt,
    })
    .returning()

  setCookie(c, 'session_id', session.id, {
    httpOnly: true,
    path: '/',
    expires: expiresAt,
    maxAge: sessionDurationMs / 1000,
    sameSite: 'Lax',
    secure: config.isProduction,
  })

  return c.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
    },
  })
})

// POST /logout (deletes session and cookie)
app.post('/logout', async (c) => {
  const db = c.get('db')
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
  }

  deleteCookie(c, 'session_id', {
    path: '/',
  })

  return c.json({ ok: true })
})

// GET /me (returns current user info if session or proxy auth is valid)
app.get('/me', async (c) => {
  const db = c.get('db')
  const config = c.get('config')

  if (config.proxyAuth) {
    return c.json({
      authenticated: true,
      proxyAuth: true,
      user: { username: 'proxy-user' },
    })
  }

  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) {
    return c.json({ authenticated: false }, 401)
  }

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
    return c.json({ authenticated: false }, 401)
  }

  return c.json({
    authenticated: true,
    user: {
      id: row.user.id,
      username: row.user.username,
    },
  })
})

export default app
