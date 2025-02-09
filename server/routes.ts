import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema, insertItemSchema, insertParticipantSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  app.post("/api/games", async (req, res) => {
    try {
      const game = insertGameSchema.parse(req.body);
      const created = await storage.createGame(game);
      res.json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid game data" });
      } else {
        res.status(500).json({ message: "Failed to create game" });
      }
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    const game = await storage.getGame(Number(req.params.id));
    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }
    res.json(game);
  });

  app.post("/api/games/:id/items", async (req, res) => {
    try {
      const item = insertItemSchema.parse(req.body);
      const created = await storage.createItem(Number(req.params.id), item);
      res.json(created);
    } catch (err) {
      res.status(400).json({ message: "Invalid item data" });
    }
  });

  app.get("/api/games/:id/items", async (req, res) => {
    const items = await storage.getGameItems(Number(req.params.id));
    res.json(items);
  });

  app.patch("/api/items/:id/price", async (req, res) => {
    const { price } = req.body;
    if (typeof price !== "number") {
      res.status(400).json({ message: "Invalid price" });
      return;
    }
    await storage.updateItemPrice(Number(req.params.id), price);
    res.json({ success: true });
  });

  app.post("/api/games/:id/participants", async (req, res) => {
    try {
      const participant = insertParticipantSchema.parse(req.body);
      const created = await storage.createParticipant(Number(req.params.id), participant);
      res.json(created);
    } catch (err) {
      res.status(400).json({ message: "Invalid participant data" });
    }
  });

  app.get("/api/games/:id/participants", async (req, res) => {
    const participants = await storage.getGameParticipants(Number(req.params.id));
    res.json(participants);
  });

  const httpServer = createServer(app);
  return httpServer;
}
