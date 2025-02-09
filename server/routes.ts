import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema, insertItemSchema, insertParticipantSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export function registerRoutes(app: Express): Server {
  app.post("/api/games", async (req, res) => {
    try {
      const game = insertGameSchema.parse(req.body);
      const created = await storage.createGame(game);
      res.json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const validationError = fromZodError(err);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Failed to create game:", err);
        res.status(500).json({ message: "Failed to create game" });
      }
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const game = await storage.getGame(Number(req.params.id));
      if (!game) {
        res.status(404).json({ message: "Game not found" });
        return;
      }
      res.json(game);
    } catch (err) {
      console.error("Failed to get game:", err);
      res.status(500).json({ message: "Failed to get game" });
    }
  });

  app.post("/api/games/:id/items", async (req, res) => {
    try {
      const item = insertItemSchema.parse(req.body);
      const created = await storage.createItem(Number(req.params.id), item);
      res.json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const validationError = fromZodError(err);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Failed to create item:", err);
        res.status(400).json({ message: "Failed to create item" });
      }
    }
  });

  app.get("/api/games/:id/items", async (req, res) => {
    try {
      const items = await storage.getGameItems(Number(req.params.id));
      res.json(items);
    } catch (err) {
      console.error("Failed to get items:", err);
      res.status(500).json({ message: "Failed to get items" });
    }
  });

  app.patch("/api/items/:id/price", async (req, res) => {
    try {
      const { price } = req.body;
      if (typeof price !== "number") {
        res.status(400).json({ message: "Invalid price - must be a number" });
        return;
      }
      await storage.updateItemPrice(Number(req.params.id), price);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to update price:", err);
      res.status(500).json({ message: "Failed to update price" });
    }
  });

  app.post("/api/games/:id/participants", async (req, res) => {
    try {
      const participant = insertParticipantSchema.parse(req.body);
      const created = await storage.createParticipant(Number(req.params.id), participant);
      res.json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const validationError = fromZodError(err);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Failed to create participant:", err);
        res.status(400).json({ message: "Failed to create participant" });
      }
    }
  });

  app.get("/api/games/:id/participants", async (req, res) => {
    try {
      const participants = await storage.getGameParticipants(Number(req.params.id));
      res.json(participants);
    } catch (err) {
      console.error("Failed to get participants:", err);
      res.status(500).json({ message: "Failed to get participants" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}