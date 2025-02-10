import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema, insertItemSchema, insertParticipantSchema, insertItemAssignmentSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export function registerRoutes(app: Express): Server {
  app.post("/api/games", async (req, res) => {
    try {
      const { title, totalPrice, creatorName, creatorEmail } = req.body;
      const game = insertGameSchema.parse({ title, totalPrice });
      
      // Create the creator participant first with the provided name
      const creator = await storage.createParticipant(0, {
        name: creatorName || "Unknown Player",  // Ensure we have a default name
        email: creatorEmail || null
      });
      
      // Create the game with the creator
      const created = await storage.createGame(game, creator.id);
      
      // Update the participant's gameId now that we have the game
      await storage.updateParticipantGameId(creator.id, created.id);
      
      // Return both the game and the creator information
      res.json({
        ...created,
        creatorId: creator.id,
        creator: {
          id: creator.id,
          name: creator.name,
          email: creator.email
        }
      });
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
      const gameId = Number(req.params.id);
      if (isNaN(gameId)) {
        res.status(400).json({ message: "Invalid game ID" });
        return;
      }

      const game = await storage.getGame(gameId);
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
        res.status(500).json({ message: "Failed to create item" });
      }
    }
  });

  app.get("/api/games/:id/items", async (req, res) => {
    try {
      const gameId = Number(req.params.id);
      if (isNaN(gameId)) {
        res.status(400).json({ message: "Invalid game ID" });
        return;
      }

      const items = await storage.getGameItems(gameId);
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
        res.status(500).json({ message: "Failed to create participant" });
      }
    }
  });

  app.get("/api/games/:id/participants", async (req, res) => {
    try {
      const gameId = Number(req.params.id);
      if (isNaN(gameId)) {
        res.status(400).json({ message: "Invalid game ID" });
        return;
      }

      const participants = await storage.getGameParticipants(gameId);
      res.json(participants);
    } catch (err) {
      console.error("Failed to get participants:", err);
      res.status(500).json({ message: "Failed to get participants" });
    }
  });

  app.post("/api/games/:id/assignments", async (req, res) => {
    try {
      const assignment = insertItemAssignmentSchema.parse(req.body);
      const created = await storage.createItemAssignment(assignment);
      res.json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const validationError = fromZodError(err);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Failed to create assignment:", err);
        res.status(500).json({ message: "Failed to create assignment" });
      }
    }
  });

  app.get("/api/games/:id/assignments", async (req, res) => {
    try {
      const gameId = Number(req.params.id);
      if (isNaN(gameId)) {
        res.status(400).json({ message: "Invalid game ID" });
        return;
      }

      const assignments = await storage.getItemAssignments(gameId);
      res.json(assignments);
    } catch (err) {
      console.error("Failed to get assignments:", err);
      res.status(500).json({ message: "Failed to get assignments" });
    }
  });

  app.delete("/api/assignments/:id", async (req, res) => {
    try {
      const assignmentId = Number(req.params.id);
      if (isNaN(assignmentId)) {
        res.status(400).json({ message: "Invalid assignment ID" });
        return;
      }

      await storage.removeItemAssignment(assignmentId);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to remove assignment:", err);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}