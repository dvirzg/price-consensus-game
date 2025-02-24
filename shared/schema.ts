import { pgTable, text, serial, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { InferModel } from 'drizzle-orm';

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  status: text("status", { enum: ["active", "inactive", "completed"] }).default("active").notNull(),
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
  gameId: integer("game_id"),
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

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type ItemAssignment = typeof itemAssignments.$inferSelect;
export type InsertItemAssignment = z.infer<typeof insertItemAssignmentSchema>;