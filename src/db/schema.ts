import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull().$defaultFn(() => new Date()),
}

// ── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username:     text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  ...timestamps,
})

// ── Sessions ─────────────────────────────────────────────────────────────────
export const sessions = sqliteTable('sessions', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// ── Profiles ────────────────────────────────────────────────────────────────
export const profiles = sqliteTable('profiles', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:        text('name').notNull(),
  description: text('description'),
  ...timestamps,
})

// ── Sites ────────────────────────────────────────────────────────────────────
export const sites = sqliteTable('sites', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  profileId:   text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  ...timestamps,
})

// ── Racks ────────────────────────────────────────────────────────────────────
export const racks = sqliteTable('racks', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  siteId:      text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  uHeight:     integer('u_height').notNull().default(42),
  ...timestamps,
})

// ── Device Templates ─────────────────────────────────────────────────────────
// category: 'switch' | 'patch_panel' | 'router' | 'server' | 'wall_panel' | 'other'
export const deviceTemplates = sqliteTable('device_templates', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:         text('name').notNull(),
  category:     text('category').notNull(),
  manufacturer: text('manufacturer'),
  model:        text('model'),
  portCount:    integer('port_count').notNull(),
  portLayout:   text('port_layout', { mode: 'json' }).notNull().$type<PortDef[]>(),
  uHeight:      integer('u_height').notNull().default(1),
  color:        text('color').notNull().default('#4a9eff'),
  ...timestamps,
})

// ── Devices ──────────────────────────────────────────────────────────────────
export const devices = sqliteTable('devices', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rackId:     text('rack_id').notNull().references(() => racks.id, { onDelete: 'cascade' }),
  templateId: text('template_id').references(() => deviceTemplates.id, { onDelete: 'set null' }),
  name:       text('name').notNull(),
  category:   text('category').notNull(),
  positionU:  integer('position_u'),
  color:      text('color').notNull().default('#4a9eff'),
  notes:      text('notes'),
  ...timestamps,
})

// ── Ports ────────────────────────────────────────────────────────────────────
// connectorType: 'rj45' | 'sfp' | 'sfp+' | 'qsfp' | 'lc' | 'sc' | 'other'
export const ports = sqliteTable('ports', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId:      text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  label:         text('label').notNull(),
  connectorType: text('connector_type').notNull().default('rj45'),
  position:      integer('position').notNull(),
  groupName:     text('group_name'),
  groupLayout:   text('group_layout'),
  notes:         text('notes'),
  createdAt:     integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// ── Cable Links ───────────────────────────────────────────────────────────────
// Dual-link support: each port has two named slots — 'front' (default) and 'back'.
// A patch panel port carries one link on each slot (e.g., front→switch, back→wall socket).
// The DB enforces at most one cable link per (portId, slot) pair on each side.
export const cableLinks = sqliteTable('cable_links', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  portAId:   text('port_a_id').notNull().references(() => ports.id, { onDelete: 'cascade' }),
  portASlot: text('port_a_slot').notNull().default('front'),
  portBId:   text('port_b_id').notNull().references(() => ports.id, { onDelete: 'cascade' }),
  portBSlot: text('port_b_slot').notNull().default('front'),
  cableType: text('cable_type').notNull().default('cat6'),
  color:     text('color'),
  label:     text('label'),
  notes:     text('notes'),
  ...timestamps,
})

// ── Types ────────────────────────────────────────────────────────────────────
export type PortDef  = { label: string; connectorType: string; position: number; groupName?: string | null; groupLayout?: 'single_row' | 'double_row' | null }
export type LinkSlot = 'front' | 'back'

export type User           = typeof users.$inferSelect
export type Session        = typeof sessions.$inferSelect
export type Profile        = typeof profiles.$inferSelect
export type Site           = typeof sites.$inferSelect
export type Rack           = typeof racks.$inferSelect
export type DeviceTemplate = typeof deviceTemplates.$inferSelect
export type Device         = typeof devices.$inferSelect
export type Port           = typeof ports.$inferSelect
export type CableLink      = typeof cableLinks.$inferSelect
