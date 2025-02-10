import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema, insertItemSchema, insertParticipantSchema, insertItemAssignmentSchema, insertBidSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export function registerRoutes(app: Express): Server {
  // Add cleanup job
  setInterval(async () => {
    try {
      await storage.cleanupExpiredGames();
    } catch (err) {
      console.error("Failed to cleanup expired games:", err);
    }
  }, 60 * 60 * 1000); // Run cleanup every hour

  app.post("/api/games", async (req, res) => {
    try {
      const { title, totalPrice, creatorName, creatorEmail } = req.body;
      const game = insertGameSchema.parse({ title, totalPrice });
      
      const creator = await storage.createParticipant(0, {
        name: creatorName || "Unknown Player",
        email: creatorEmail || null
      });
      
      // Create game with expiry time set to 48 hours from now
      const created = await storage.createGame(game, creator.id);
      
      await storage.updateParticipantGameId(creator.id, created.id);
      
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

  // Add route to get game by unique ID
  app.get("/api/games/by-id/:uniqueId", async (req, res) => {
    try {
      const game = await storage.getGameByUniqueId(req.params.uniqueId);
      if (!game) {
        res.status(404).json({ message: "Game not found" });
        return;
      }

      // Update last active timestamp
      await storage.updateGameLastActive(game.id);
      res.json(game);
    } catch (err) {
      console.error("Failed to get game:", err);
      res.status(500).json({ message: "Failed to get game" });
    }
  });

  // Update existing game route to also update last active
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

      // Update last active timestamp
      await storage.updateGameLastActive(gameId);
      res.json(game);
    } catch (err) {
      console.error("Failed to get game:", err);
      res.status(500).json({ message: "Failed to get game" });
    }
  });

  // Add route to update game status
  app.patch("/api/games/:id/status", async (req, res) => {
    try {
      const gameId = Number(req.params.id);
      const { status } = req.body;
      
      if (isNaN(gameId)) {
        res.status(400).json({ message: "Invalid game ID" });
        return;
      }

      if (!["active", "resolved", "expired"].includes(status)) {
        res.status(400).json({ message: "Invalid status" });
        return;
      }

      await storage.updateGameStatus(gameId, status);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to update game status:", err);
      res.status(500).json({ message: "Failed to update game status" });
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

  // Add bid endpoints
  app.post("/api/games/:id/bids", async (req, res) => {
    try {
      const bid = insertBidSchema.parse({
        ...req.body,
        gameId: Number(req.params.id),
      });
      const created = await storage.createBid(bid);
      res.json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const validationError = fromZodError(err);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Failed to create bid:", err);
        res.status(500).json({ message: "Failed to create bid" });
      }
    }
  });

  app.get("/api/games/:id/bids", async (req, res) => {
    try {
      const gameId = Number(req.params.id);
      if (isNaN(gameId)) {
        res.status(400).json({ message: "Invalid game ID" });
        return;
      }

      const bids = await storage.getGameBids(gameId);
      res.json(bids);
    } catch (err) {
      console.error("Failed to get bids:", err);
      res.status(500).json({ message: "Failed to get bids" });
    }
  });

  app.get("/api/items/:id/bids", async (req, res) => {
    try {
      const itemId = Number(req.params.id);
      if (isNaN(itemId)) {
        res.status(400).json({ message: "Invalid item ID" });
        return;
      }

      const bids = await storage.getItemBids(itemId);
      res.json(bids);
    } catch (err) {
      console.error("Failed to get item bids:", err);
      res.status(500).json({ message: "Failed to get item bids" });
    }
  });

  app.patch("/api/bids/:id", async (req, res) => {
    try {
      const bidId = Number(req.params.id);
      const { price, needsConfirmation } = req.body;
      
      if (isNaN(bidId)) {
        res.status(400).json({ message: "Invalid bid ID" });
        return;
      }
      if (typeof price !== "number") {
        res.status(400).json({ message: "Invalid price - must be a number" });
        return;
      }
      if (typeof needsConfirmation !== "boolean") {
        res.status(400).json({ message: "Invalid needsConfirmation - must be a boolean" });
        return;
      }

      await storage.updateBid(bidId, price, needsConfirmation);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to update bid:", err);
      res.status(500).json({ message: "Failed to update bid" });
    }
  });

  app.delete("/api/bids/:id", async (req, res) => {
    try {
      const bidId = Number(req.params.id);
      if (isNaN(bidId)) {
        res.status(400).json({ message: "Invalid bid ID" });
        return;
      }

      await storage.removeBid(bidId);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete bid:", err);
      res.status(500).json({ message: "Failed to delete bid" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}