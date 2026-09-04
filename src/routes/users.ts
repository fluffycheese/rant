import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema.js'
import { hashPassword } from '../platform/crypto.js'
import type { AppEnv } from '../platform/types.js'

const CreateSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
})

const app = new Hono<AppEnv>()

// Require proxy auth check - if true, users route should probably be disabled,
// but we'll let the frontend handle the UX. The backend will return an error just in case.

const enforceNoProxy: import('hono').MiddlewareHandler<AppEnv> = async (c, next) => {
  const config = c.get('config')
  if (config.proxyAuth) {
    return c.json({ error: 'User management disabled when PROXY_AUTH is true' }, 403)
  }
  await next()
}

app.use('*', enforceNoProxy)

app.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db.select({
    id: users.id,
    username: users.username,
    isProtected: users.isProtected,
  }).from(users)
  return c.json(rows)
})

app.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = CreateSchema.parse(body)

  const passwordHash = await hashPassword(input.password)

  try {
    const [row] = await db.insert(users).values({
      username: input.username,
      passwordHash,
    }).returning({
      id: users.id,
      username: users.username,
    })
    return c.json(row, 201)
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint')) {
      return c.json({ error: 'Username already exists' }, 400)
    }
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

app.delete('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')

  // Prevent deleting the last user
  const userCount = await db.select().from(users)
  if (userCount.length <= 1) {
    return c.json({ error: 'Cannot delete the last remaining user' }, 400)
  }

  const [existing] = await db.select({ isProtected: users.isProtected }).from(users).where(eq(users.id, id))
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (existing.isProtected) return c.json({ error: 'Protected demo resources cannot be deleted' }, 403)

  await db.delete(users).where(eq(users.id, id))

  return c.json({ ok: true })
})

const ChangePasswordSchema = z.object({
  password: z.string().min(6),
})

app.put('/:id/password', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const body = await c.req.json()
  const input = ChangePasswordSchema.parse(body)

  const config = c.get('config')
  const [existing] = await db.select({ username: users.username }).from(users).where(eq(users.id, id))
  if (!existing) return c.json({ error: 'Not found' }, 404)

  if (config.demoMode && (existing.username === 'admin' || existing.username === 'demo')) {
    return c.json({ error: 'Cannot change password for core demo users' }, 403)
  }

  const passwordHash = await hashPassword(input.password)

  const [row] = await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
    })

  if (!row) return c.json({ error: 'Not found' }, 404)

  return c.json({ ok: true })
})

export default app
