// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', { id: text().primaryKey(), email: text().notNull().unique(), name: text().notNull(), password: text().notNull(), role: text().notNull(), active: integer().notNull().default(1), limit: integer().notNull().default(0), created: text().notNull() });
export const sessions = sqliteTable('sessions', { id: text().primaryKey(), userId: text().notNull().references(()=>users.id), expires: integer().notNull() });
export const settings = sqliteTable('settings', { key: text().primaryKey(), value: text().notNull() });
export const attempts = sqliteTable('attempts', { key: text().primaryKey(), count: integer().notNull(), expires: integer().notNull() });
export const orders = sqliteTable('orders', { id: text().primaryKey(), paid: integer().notNull(), channel: text().notNull(), data: text().notNull() });
export const cases = sqliteTable('cases', { id: text().primaryKey(), orderId: text().notNull().references(()=>orders.id), version: integer().notNull(), mutation: text().notNull(), status: text().notNull(), data: text().notNull(), created: text().notNull(), updated: text().notNull() }, t=>[index('cases_order').on(t.orderId),index('cases_status').on(t.status)]);
export const refunds = sqliteTable('refunds', { id: text().primaryKey(), caseId: text().notNull().references(()=>cases.id), orderId: text().notNull().references(()=>orders.id), amount: integer().notNull(), status: text().notNull(), reference: text(), created: text().notNull() },t=>[index('refunds_order').on(t.orderId)]);
export const photos = sqliteTable('photos', { id:text().primaryKey(), caseId:text().notNull().references(()=>cases.id), itemId:text().notNull(), parcelId:text().notNull(), key:text().notNull(), mime:text().notNull(), actor:text().notNull(), created:text().notNull() });
export const audit = sqliteTable('audit', { id:text().primaryKey(), caseId:text(), actor:text().notNull(), action:text().notNull(), detail:text().notNull(), created:text().notNull() },t=>[index('audit_case').on(t.caseId)]);
