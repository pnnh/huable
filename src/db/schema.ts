import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import bs58 from "bs58";
import { uuidv7 } from "uuidv7";

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }

  return bytes;
}

export function encodeUuidToBase58(uuid: string): string {
  return bs58.encode(uuidToBytes(uuid));
}

export function createId(): string {
  return encodeUuidToBase58(uuidv7());
}

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  nickname: text("nickname"),
  bio: text("bio"),
  sysrole: text("sysrole").notNull().default("normal").$type<"admin" | "normal">(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey().$defaultFn(createId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  approvalStatus: text("approval_status")
    .notNull()
    .default("pending")
    .$type<"pending" | "approved">(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey().$defaultFn(createId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  channelId: text("channel_id").references(() => channels.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isPublished: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(false),
  approvalStatus: text("approval_status")
    .notNull()
    .default("pending")
    .$type<"pending" | "approved">(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

export const noteAttachments = sqliteTable("note_attachments", {
  id: text("id").primaryKey().$defaultFn(createId),
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const usersRelations = relations(users, ({ many }) => ({
  channels: many(channels),
  notes: many(notes),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  user: one(users, {
    fields: [channels.userId],
    references: [users.id],
  }),
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
  channel: one(channels, {
    fields: [notes.channelId],
    references: [channels.id],
  }),
  attachments: many(noteAttachments),
}));

export const approvalEvents = sqliteTable("approval_events", {
  id: text("id").primaryKey().$defaultFn(createId),
  type: text("type").notNull().default("note").$type<"note" | "channel">(),
  noteId: text("note_id")
    .references(() => notes.id, { onDelete: "cascade" }),
  channelId: text("channel_id")
    .references(() => channels.id, { onDelete: "cascade" }),
  action: text("action").notNull().$type<"created" | "updated">(),
  isHandled: integer("is_handled", { mode: "boolean" }).notNull().default(false),
  handledAt: integer("handled_at"),
  handledBy: text("handled_by").references(() => users.id, { onDelete: "set null" }),
  result: text("result").$type<"approved" | "rejected">(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const approvalEventsRelations = relations(approvalEvents, ({ one }) => ({
  note: one(notes, {
    fields: [approvalEvents.noteId],
    references: [notes.id],
  }),
  channel: one(channels, {
    fields: [approvalEvents.channelId],
    references: [channels.id],
  }),
  handler: one(users, {
    fields: [approvalEvents.handledBy],
    references: [users.id],
  }),
}));

export const noteAttachmentsRelations = relations(noteAttachments, ({ one }) => ({
  note: one(notes, {
    fields: [noteAttachments.noteId],
    references: [notes.id],
  }),
}));
