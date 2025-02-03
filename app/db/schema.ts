import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable('users', {
  id: int('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').notNull()
});

export const emails = sqliteTable('emails', {
  id: text('id').primaryKey(),
  from: text('from').notNull(),
  to: text('to').notNull(),
  subject: text('subject').notNull(),
  receivedAt: text('received_at').notNull(),
  spfStatus: text('spf_status').notNull(),
  dmarcStatus: text('dmarc_status').notNull(),
  dkimStatus: text('dkim_status').notNull(),
  headers: text('headers').notNull(),
  size: int('size').notNull(),
  rawEmail: text('raw_email').notNull(),
  type: text('type').notNull().default('received'),
  starred: int('starred').notNull().default(0),
  readed: int('readed').notNull().default(0)
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});
