import { Game, InsertGame, Item, InsertItem, Participant, InsertParticipant, ItemAssignment, InsertItemAssignment } from "@shared/schema";
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { games, items, participants, itemAssignments } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  createGame(game: InsertGame, creatorId: number): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  updateGameStatus(id: number, status: "active" | "inactive" | "completed"): Promise<void>;
  updateGameLastActive(id: number): Promise<void>;

  createItem(gameId: number, item: InsertItem): Promise<Item>;
  getGameItems(gameId: number): Promise<Item[]>;
  updateItemPrice(id: number, price: number): Promise<void>;

  createParticipant(gameId: number, participant: InsertParticipant): Promise<Participant>;
  getGameParticipants(gameId: number): Promise<Participant[]>;
  updateParticipantGameId(participantId: number, gameId: number): Promise<void>;

  createItemAssignment(assignment: InsertItemAssignment): Promise<ItemAssignment>;
  getItemAssignments(gameId: number): Promise<ItemAssignment[]>;
  removeItemAssignment(assignmentId: number): Promise<void>;
}

export class PostgresStorage implements IStorage {
  private db;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.db = drizzle(pool);
  }

  async createGame(game: InsertGame, creatorId: number): Promise<Game> {
    const totalPrice = Number(game.totalPrice);
    if (isNaN(totalPrice)) {
      throw new Error('Total price must be a valid number');
    }
    
    const [created] = await this.db.insert(games)
      .values({
        title: game.title,
        totalPrice: totalPrice.toString(),
        creatorId,
        createdAt: new Date(),
        lastActive: new Date(),
        status: "active"
      })
      .returning() as Game[];
    return created;
  }

  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await this.db.select()
      .from(games)
      .where(eq(games.id, id))
      .limit(1) as Game[];
    return game;
  }

  async updateGameStatus(id: number, status: "active" | "inactive" | "completed"): Promise<void> {
    await this.db.update(games)
      .set({ status })
      .where(eq(games.id, id));
  }

  async updateGameLastActive(id: number): Promise<void> {
    await this.db.update(games)
      .set({ lastActive: new Date() })
      .where(eq(games.id, id));
  }

  async createItem(gameId: number, item: InsertItem): Promise<Item> {
    const currentPrice = Number(item.currentPrice);
    if (isNaN(currentPrice)) {
      throw new Error('Current price must be a valid number');
    }

    const [created] = await this.db.insert(items)
      .values({ 
        title: item.title,
        imageData: item.imageData,
        currentPrice: currentPrice.toString(),
        gameId
      })
      .returning() as Item[];
    return created;
  }

  async getGameItems(gameId: number): Promise<Item[]> {
    return this.db.select()
      .from(items)
      .where(eq(items.gameId, gameId)) as Promise<Item[]>;
  }

  async updateItemPrice(id: number, price: number): Promise<void> {
    await this.db.update(items)
      .set({ currentPrice: price.toString() })
      .where(eq(items.id, id));
  }

  async createParticipant(gameId: number, participant: InsertParticipant): Promise<Participant> {
    const [created] = await this.db.insert(participants)
      .values({ 
        name: participant.name,
        email: participant.email,
        gameId 
      })
      .returning() as Participant[];
    return created;
  }

  async getGameParticipants(gameId: number): Promise<Participant[]> {
    return this.db.select()
      .from(participants)
      .where(eq(participants.gameId, gameId)) as Promise<Participant[]>;
  }

  async updateParticipantGameId(participantId: number, gameId: number): Promise<void> {
    await this.db.update(participants)
      .set({ gameId })
      .where(eq(participants.id, participantId));
  }

  async createItemAssignment(assignment: InsertItemAssignment): Promise<ItemAssignment> {
    const [created] = await this.db.insert(itemAssignments)
      .values({ 
        itemId: assignment.itemId,
        participantId: assignment.participantId,
        gameId: assignment.gameId,
        assignedAt: new Date() 
      })
      .returning() as ItemAssignment[];
    return created;
  }

  async getItemAssignments(gameId: number): Promise<ItemAssignment[]> {
    return this.db.select()
      .from(itemAssignments)
      .where(eq(itemAssignments.gameId, gameId)) as Promise<ItemAssignment[]>;
  }

  async removeItemAssignment(assignmentId: number): Promise<void> {
    await this.db.delete(itemAssignments)
      .where(eq(itemAssignments.id, assignmentId));
  }
}

// Export a singleton instance
export const storage = new PostgresStorage();