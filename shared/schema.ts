import { pgTable, text, serial, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  status: text("status", { enum: ["active", "inactive", "completed"] }).default("active").notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id).notNull(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
});

export const insertGameSchema = createInsertSchema(games).omit({ 
  id: true,
  createdAt: true,
  lastActive: true,
  status: true 
});

export const insertItemSchema = createInsertSchema(items).omit({ 
  id: true,
  gameId: true 
});

export const insertParticipantSchema = createInsertSchema(participants).omit({ 
  id: true,
  gameId: true 
});

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
