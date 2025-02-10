import { Game, InsertGame, Item, InsertItem, Participant, InsertParticipant, ItemAssignment, InsertItemAssignment, Bid, InsertBid } from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  createGame(game: InsertGame, creatorId: number): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  getGameByUniqueId(uniqueId: string): Promise<Game | undefined>;
  updateGameStatus(id: number, status: "active" | "resolved" | "expired"): Promise<void>;
  updateGameLastActive(id: number): Promise<void>;
  updateGameExpiry(id: number, expiresAt: Date): Promise<void>;
  cleanupExpiredGames(): Promise<void>;

  createItem(gameId: number, item: InsertItem): Promise<Item>;
  getGameItems(gameId: number): Promise<Item[]>;
  updateItemPrice(id: number, price: number): Promise<void>;

  createParticipant(gameId: number, participant: InsertParticipant): Promise<Participant>;
  getGameParticipants(gameId: number): Promise<Participant[]>;
  updateParticipantGameId(participantId: number, gameId: number): Promise<void>;

  createItemAssignment(assignment: InsertItemAssignment): Promise<ItemAssignment>;
  getItemAssignments(gameId: number): Promise<ItemAssignment[]>;
  removeItemAssignment(assignmentId: number): Promise<void>;

  createBid(bid: InsertBid): Promise<Bid>;
  getGameBids(gameId: number): Promise<Bid[]>;
  getItemBids(itemId: number): Promise<Bid[]>;
  updateBid(bidId: number, price: number, needsConfirmation: boolean): Promise<void>;
  removeBid(bidId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private games: Map<number, Game>;
  private items: Map<number, Item>;
  private participants: Map<number, Participant>;
  private itemAssignments: Map<number, ItemAssignment>;
  private bids: Map<number, Bid>;
  private currentGameId: number;
  private currentItemId: number;
  private currentParticipantId: number;
  private currentAssignmentId: number;
  private currentBidId: number;

  constructor() {
    this.games = new Map();
    this.items = new Map();
    this.participants = new Map();
    this.itemAssignments = new Map();
    this.bids = new Map();
    this.currentGameId = 1;
    this.currentItemId = 1;
    this.currentParticipantId = 1;
    this.currentAssignmentId = 1;
    this.currentBidId = 1;
  }

  async createGame(game: InsertGame, creatorId: number): Promise<Game> {
    const id = this.currentGameId++;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

    const newGame: Game = {
      id,
      uniqueId: nanoid(10),
      title: game.title,
      totalPrice: game.totalPrice.toString(),
      createdAt: now,
      lastActive: now,
      expiresAt,
      status: "active",
      creatorId
    };
    this.games.set(id, newGame);
    return newGame;
  }

  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGameByUniqueId(uniqueId: string): Promise<Game | undefined> {
    return Array.from(this.games.values()).find(game => game.uniqueId === uniqueId);
  }

  async updateGameStatus(id: number, status: "active" | "resolved" | "expired"): Promise<void> {
    const game = this.games.get(id);
    if (game) {
      const now = new Date();
      let expiresAt = game.expiresAt;

      // If game is resolved, set expiry to 12 hours from now
      if (status === "resolved") {
        expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      }
      // If game becomes active again, set expiry to 48 hours from now
      else if (status === "active") {
        expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      }

      this.games.set(id, { 
        ...game, 
        status,
        expiresAt,
        lastActive: now 
      });
    }
  }

  async updateGameLastActive(id: number): Promise<void> {
    const game = this.games.get(id);
    if (game) {
      const now = new Date();
      // Update expiry time when game is accessed
      const expiresAt = game.status === "resolved"
        ? new Date(now.getTime() + 12 * 60 * 60 * 1000)  // 12 hours for resolved games
        : new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours for active games

      this.games.set(id, { 
        ...game, 
        lastActive: now,
        expiresAt
      });
    }
  }

  async updateGameExpiry(id: number, expiresAt: Date): Promise<void> {
    const game = this.games.get(id);
    if (game) {
      this.games.set(id, { ...game, expiresAt });
    }
  }

  async cleanupExpiredGames(): Promise<void> {
    const now = new Date();
    const entries = Array.from(this.games.entries());
    for (const [id, game] of entries) {
      if (game.expiresAt <= now) {
        this.games.delete(id);
      }
    }
  }

  async createItem(gameId: number, item: InsertItem): Promise<Item> {
    const id = this.currentItemId++;
    const newItem: Item = {
      ...item,
      id,
      gameId,
      currentPrice: item.currentPrice.toString(),
    };
    this.items.set(id, newItem);
    return newItem;
  }

  async getGameItems(gameId: number): Promise<Item[]> {
    return Array.from(this.items.values()).filter(item => item.gameId === gameId);
  }

  async updateItemPrice(id: number, price: number): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      this.items.set(id, { ...item, currentPrice: price.toString() });
    }
  }

  async createParticipant(gameId: number, participant: InsertParticipant): Promise<Participant> {
    const id = this.currentParticipantId++;
    const newParticipant: Participant = {
      ...participant,
      id,
      gameId,
      email: participant.email || null,
    };
    this.participants.set(id, newParticipant);
    return newParticipant;
  }

  async getGameParticipants(gameId: number): Promise<Participant[]> {
    return Array.from(this.participants.values()).filter(p => p.gameId === gameId);
  }

  async updateParticipantGameId(participantId: number, gameId: number): Promise<void> {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.gameId = gameId;
      this.participants.set(participantId, participant);
    }
  }

  async createItemAssignment(assignment: InsertItemAssignment): Promise<ItemAssignment> {
    const id = this.currentAssignmentId++;
    const newAssignment: ItemAssignment = {
      ...assignment,
      id,
      assignedAt: new Date(),
    };
    this.itemAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async getItemAssignments(gameId: number): Promise<ItemAssignment[]> {
    return Array.from(this.itemAssignments.values()).filter(a => a.gameId === gameId);
  }

  async removeItemAssignment(assignmentId: number): Promise<void> {
    this.itemAssignments.delete(assignmentId);
  }

  async createBid(bid: InsertBid): Promise<Bid> {
    const id = this.currentBidId++;
    const newBid: Bid = {
      ...bid,
      id,
      price: bid.price.toString(),
      timestamp: new Date(),
      needsConfirmation: bid.needsConfirmation ?? false,
    };
    this.bids.set(id, newBid);
    return newBid;
  }

  async getGameBids(gameId: number): Promise<Bid[]> {
    return Array.from(this.bids.values()).filter(bid => bid.gameId === gameId);
  }

  async getItemBids(itemId: number): Promise<Bid[]> {
    return Array.from(this.bids.values()).filter(bid => bid.itemId === itemId);
  }

  async updateBid(bidId: number, price: number, needsConfirmation: boolean): Promise<void> {
    const bid = this.bids.get(bidId);
    if (!bid) {
      throw new Error("Bid not found");
    }
    this.bids.set(bidId, {
      ...bid,
      price: price.toString(),
      needsConfirmation,
      timestamp: new Date(),
    });
  }

  async removeBid(bidId: number): Promise<void> {
    this.bids.delete(bidId);
  }
}

export const storage = new MemStorage();