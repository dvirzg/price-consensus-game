import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from 'nanoid';

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  uniqueId: text("unique_id").notNull().default(() => nanoid(10)),
  title: text("title").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status", { enum: ["active", "resolved", "expired"] }).default("active").notNull(),
  creatorId: integer("creator_id").references(() => participants.id),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id).notNull(),
  title: text("title").notNull(),
  imageData: text("image_data").notNull(), // Store base64 image data
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
});

export const itemAssignments = pgTable("item_assignments", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  participantId: integer("participant_id").references(() => participants.id).notNull(),
  gameId: integer("game_id").references(() => games.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  participantId: integer("participant_id").references(() => participants.id).notNull(),
  gameId: integer("game_id").references(() => games.id).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  needsConfirmation: boolean("needs_confirmation").default(false).notNull(),
});

export const insertGameSchema = createInsertSchema(games).extend({
  totalPrice: z.number().min(0.01, "Total price must be greater than 0"),
}).omit({ 
  id: true,
  createdAt: true,
  lastActive: true,
  status: true,
  creatorId: true
});

export const insertItemSchema = createInsertSchema(items).extend({
  currentPrice: z.number().min(0),
}).omit({ 
  id: true,
  gameId: true 
});

export const insertParticipantSchema = createInsertSchema(participants).omit({ 
  id: true,
  gameId: true 
});

export const insertItemAssignmentSchema = createInsertSchema(itemAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertBidSchema = createInsertSchema(bids);

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type ItemAssignment = typeof itemAssignments.$inferSelect;
export type InsertItemAssignment = z.infer<typeof insertItemAssignmentSchema>;
export type Bid = typeof bids.$inferSelect;
export type InsertBid = typeof bids.$inferInsert;