import { Game, InsertGame, Item, InsertItem, Participant, InsertParticipant, ItemAssignment, InsertItemAssignment, Bid, InsertBid } from "@shared/schema";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export interface IStorage {
  createGame(game: Omit<Game, 'id'>): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  getGameByUniqueId(uniqueId: string): Promise<Game | undefined>;
  updateGameStatus(id: number, status: "active" | "inactive" | "completed", lastActive: Date, expiresAt: Date): Promise<void>;
  updateGameActivity(id: number, lastActive: Date, expiresAt: Date): Promise<void>;

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

export class RedisStorage implements IStorage {
  private redis: Redis;
  private counters: { [key: string]: number };

  constructor() {
    this.redis = new Redis(REDIS_URL);
    this.counters = {};
  }

  private async getNextId(type: string): Promise<number> {
    const id = await this.redis.incr(`counter:${type}`);
    return id;
  }

  private getKey(type: string, id: number): string {
    return `${type}:${id}`;
  }

  private getGameKey(uniqueId: string): string {
    return `game:uniqueId:${uniqueId}`;
  }

  async createGame(game: Omit<Game, 'id'>): Promise<Game> {
    const id = await this.getNextId('game');
    const newGame: Game = {
      ...game,
      id,
      createdAt: new Date(),
      lastActive: new Date(),
      status: "active",
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
    };

    await this.redis.set(this.getKey('game', id), JSON.stringify(newGame));
    await this.redis.set(this.getGameKey(game.uniqueId), id);

    return newGame;
  }

  async getGame(id: number): Promise<Game | undefined> {
    const data = await this.redis.get(this.getKey('game', id));
    if (!data) return undefined;
    const game = JSON.parse(data);
    // Convert date strings back to Date objects
    return {
      ...game,
      createdAt: new Date(game.createdAt),
      lastActive: new Date(game.lastActive),
      expiresAt: game.expiresAt ? new Date(game.expiresAt) : null,
    };
  }

  async getGameByUniqueId(uniqueId: string): Promise<Game | undefined> {
    const id = await this.redis.get(this.getGameKey(uniqueId));
    if (!id) return undefined;
    return this.getGame(parseInt(id));
  }

  async updateGameStatus(id: number, status: "active" | "inactive" | "completed", lastActive: Date, expiresAt: Date): Promise<void> {
    const game = await this.getGame(id);
    if (!game) return;

    const updatedGame = {
      ...game,
      status,
      lastActive,
      expiresAt,
    };

    await this.redis.set(this.getKey('game', id), JSON.stringify(updatedGame));
  }

  async updateGameActivity(id: number, lastActive: Date, expiresAt: Date): Promise<void> {
    const game = await this.getGame(id);
    if (!game) return;

    const updatedGame = {
      ...game,
      lastActive,
      expiresAt,
    };

    await this.redis.set(this.getKey('game', id), JSON.stringify(updatedGame));
  }

  async createItem(gameId: number, item: InsertItem): Promise<Item> {
    const id = await this.getNextId('item');
    const newItem: Item = {
      ...item,
      id,
      gameId,
      currentPrice: item.currentPrice.toString(),
    };

    await this.redis.set(this.getKey('item', id), JSON.stringify(newItem));
    await this.redis.sadd(`game:${gameId}:items`, id.toString());

    return newItem;
  }

  async getGameItems(gameId: number): Promise<Item[]> {
    const itemIds = await this.redis.smembers(`game:${gameId}:items`);
    const items = await Promise.all(
      itemIds.map(async (idStr) => {
        const data = await this.redis.get(this.getKey('item', parseInt(idStr)));
        return data ? JSON.parse(data) : null;
      })
    );
    return items.filter((item): item is Item => item !== null);
  }

  async updateItemPrice(id: number, price: number): Promise<void> {
    const itemData = await this.redis.get(this.getKey('item', id));
    if (!itemData) return;

    const item = JSON.parse(itemData);
    const updatedItem = {
      ...item,
      currentPrice: price.toString(),
    };

    await this.redis.set(this.getKey('item', id), JSON.stringify(updatedItem));
  }

  async createParticipant(gameId: number, participant: InsertParticipant): Promise<Participant> {
    const id = await this.getNextId('participant');
    const newParticipant: Participant = {
      ...participant,
      id,
      gameId,
      email: participant.email || null,
    };

    await this.redis.set(this.getKey('participant', id), JSON.stringify(newParticipant));
    await this.redis.sadd(`game:${gameId}:participants`, id.toString());

    return newParticipant;
  }

  async getGameParticipants(gameId: number): Promise<Participant[]> {
    const participantIds = await this.redis.smembers(`game:${gameId}:participants`);
    const participants = await Promise.all(
      participantIds.map(async (idStr) => {
        const data = await this.redis.get(this.getKey('participant', parseInt(idStr)));
        return data ? JSON.parse(data) : null;
      })
    );
    return participants.filter((participant): participant is Participant => participant !== null);
  }

  async updateParticipantGameId(participantId: number, gameId: number): Promise<void> {
    const participantData = await this.redis.get(this.getKey('participant', participantId));
    if (!participantData) return;

    const participant = JSON.parse(participantData);
    const updatedParticipant = {
      ...participant,
      gameId,
    };

    await this.redis.set(this.getKey('participant', participantId), JSON.stringify(updatedParticipant));
  }

  async createItemAssignment(assignment: InsertItemAssignment): Promise<ItemAssignment> {
    const id = await this.getNextId('itemAssignment');
    const newAssignment: ItemAssignment = {
      ...assignment,
      id,
      assignedAt: new Date(),
    };

    await this.redis.set(this.getKey('itemAssignment', id), JSON.stringify(newAssignment));
    await this.redis.sadd(`game:${assignment.gameId}:itemAssignments`, id.toString());

    return newAssignment;
  }

  async getItemAssignments(gameId: number): Promise<ItemAssignment[]> {
    const assignmentIds = await this.redis.smembers(`game:${gameId}:itemAssignments`);
    const assignments = await Promise.all(
      assignmentIds.map(async (idStr) => {
        const data = await this.redis.get(this.getKey('itemAssignment', parseInt(idStr)));
        if (!data) return null;
        const assignment = JSON.parse(data);
        return {
          ...assignment,
          assignedAt: new Date(assignment.assignedAt),
        };
      })
    );
    return assignments.filter((assignment): assignment is ItemAssignment => assignment !== null);
  }

  async removeItemAssignment(assignmentId: number): Promise<void> {
    const assignmentData = await this.redis.get(this.getKey('itemAssignment', assignmentId));
    if (!assignmentData) return;

    const assignment = JSON.parse(assignmentData);
    await this.redis.del(this.getKey('itemAssignment', assignmentId));
    await this.redis.srem(`game:${assignment.gameId}:itemAssignments`, assignmentId.toString());
  }

  async createBid(bid: InsertBid): Promise<Bid> {
    const id = await this.getNextId('bid');
    const newBid: Bid = {
      ...bid,
      id,
      price: bid.price.toString(),
      timestamp: new Date(),
      needsConfirmation: bid.needsConfirmation ?? false,
    };

    await this.redis.set(this.getKey('bid', id), JSON.stringify(newBid));
    await this.redis.sadd(`game:${bid.gameId}:bids`, id.toString());

    return newBid;
  }

  async getGameBids(gameId: number): Promise<Bid[]> {
    const bidIds = await this.redis.smembers(`game:${gameId}:bids`);
    const bids = await Promise.all(
      bidIds.map(async (idStr) => {
        const data = await this.redis.get(this.getKey('bid', parseInt(idStr)));
        if (!data) return null;
        const bid = JSON.parse(data);
        return {
          ...bid,
          timestamp: new Date(bid.timestamp),
        };
      })
    );
    return bids.filter((bid): bid is Bid => bid !== null);
  }

  async getItemBids(itemId: number): Promise<Bid[]> {
    const game = await this.getGame(itemId);
    if (!game) return [];

    const bids = await this.getGameBids(game.id);
    return bids.filter(bid => bid.itemId === itemId);
  }

  async updateBid(bidId: number, price: number, needsConfirmation: boolean): Promise<void> {
    const bidData = await this.redis.get(this.getKey('bid', bidId));
    if (!bidData) return;

    const bid = JSON.parse(bidData);
    const updatedBid = {
      ...bid,
      price: price.toString(),
      needsConfirmation,
      timestamp: new Date(),
    };

    await this.redis.set(this.getKey('bid', bidId), JSON.stringify(updatedBid));
  }

  async removeBid(bidId: number): Promise<void> {
    const bidData = await this.redis.get(this.getKey('bid', bidId));
    if (!bidData) return;

    const bid = JSON.parse(bidData);
    await this.redis.del(this.getKey('bid', bidId));
    await this.redis.srem(`game:${bid.gameId}:bids`, bidId.toString());
  }
}

// Initialize storage with Redis
export const storage = new RedisStorage();