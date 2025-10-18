import { pgTable, text, timestamp, boolean, varchar, uuid, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  welcomeMessage: text('welcome_message').default('您好！我是智能客服，很高兴为您服务。'),
  offlineMessage: text('offline_message').default('我们当前不在线，但您可以留言，我们会尽快回复您。'),
  autoOpenWidget: boolean('auto_open_widget').default(true),
  allowCustomerImageUpload: boolean('allow_customer_image_upload').default(true),
  allowAgentImageUpload: boolean('allow_agent_image_upload').default(true),
  brandLogoUrl: text('brand_logo_url'),
  primaryColor: varchar('primary_color', { length: 7 }).default('#3F51B5'),
  backgroundColor: varchar('background_color', { length: 7 }).default('#F0F2F5'),
  workspaceName: varchar('workspace_name', { length: 255 }),
  workspaceDomain: varchar('workspace_domain', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    customerName: varchar('customer_name', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    isActive: boolean('is_active').default(true),
});

export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
    text: text('text'),
    sender: varchar('sender', { length: 50 }).notNull(), // 'agent' or 'customer'
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    metadata: jsonb('metadata').$type<{ imageUrl?: string }>(),
});

export const quickReplies = pgTable('quick_replies', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
