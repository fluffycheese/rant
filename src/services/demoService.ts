import { executeImport, ImportPayloadSchema } from './importService.js'
import { users, sessions } from '../db/schema.js'
import { hashPassword } from '../platform/crypto.js'
import type { AppDatabase } from '../platform/types.js'
import defaultDemoSeed from '../db/demo-seed.json' with { type: 'json' }

export async function resetDemoEnvironment(db: AppDatabase) {
  // Parse the bundled seed payload just to be safe with validation
  const payload = ImportPayloadSchema.parse(defaultDemoSeed)

  // Wipe all existing sessions and users
  await db.delete(sessions)
  await db.delete(users)

  // Create admin user
  const adminPass = crypto.randomUUID().slice(0, 16).replace(/-/g, '')
  const adminHash = await hashPassword(adminPass)
  await db.insert(users).values({
    username: 'admin',
    passwordHash: adminHash,
    isProtected: true,
  })

  // Create demo user
  const demoHash = await hashPassword('demo')
  await db.insert(users).values({
    username: 'demo',
    passwordHash: demoHash,
    isProtected: true,
  })

  console.log(`\n=== DEMO RESET ===`)
  console.log(`Admin Username: admin`)
  console.log(`Admin Password: ${adminPass}`)
  console.log(`Demo Username: demo`)
  console.log(`Demo Password: demo`)
  console.log(`==================\n`)

  // Force replace mode for demo reset
  await executeImport(db, payload, 'replace')
}
