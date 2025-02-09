import { Game, InsertGame, Item, InsertItem, Participant, InsertParticipant, ItemAssignment, InsertItemAssignment } from "@shared/schema";

export interface IStorage {
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  updateGameStatus(id: number, status: "active" | "inactive" | "completed"): Promise<void>;
  updateGameLastActive(id: number): Promise<void>;

  createItem(gameId: number, item: InsertItem): Promise<Item>;
  getGameItems(gameId: number): Promise<Item[]>;
  updateItemPrice(id: number, price: number): Promise<void>;

  createParticipant(gameId: number, participant: InsertParticipant): Promise<Participant>;
  getGameParticipants(gameId: number): Promise<Participant[]>;

  createItemAssignment(assignment: InsertItemAssignment): Promise<ItemAssignment>;
  getItemAssignments(gameId: number): Promise<ItemAssignment[]>;
  removeItemAssignment(assignmentId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private games: Map<number, Game>;
  private items: Map<number, Item>;
  private participants: Map<number, Participant>;
  private itemAssignments: Map<number, ItemAssignment>;
  private currentGameId: number;
  private currentItemId: number;
  private currentParticipantId: number;
  private currentAssignmentId: number;

  constructor() {
    this.games = new Map();
    this.items = new Map();
    this.participants = new Map();
    this.itemAssignments = new Map();
    this.currentGameId = 1;
    this.currentItemId = 1;
    this.currentParticipantId = 1;
    this.currentAssignmentId = 1;
  }

  async createGame(game: InsertGame): Promise<Game> {
    const id = this.currentGameId++;
    const newGame: Game = {
      ...game,
      id,
      totalPrice: game.totalPrice.toString(),
      createdAt: new Date(),
      lastActive: new Date(),
      status: "active",
    };
    this.games.set(id, newGame);
    return newGame;
  }

  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async updateGameStatus(id: number, status: "active" | "inactive" | "completed"): Promise<void> {
    const game = this.games.get(id);
    if (game) {
      this.games.set(id, { ...game, status });
    }
  }

  async updateGameLastActive(id: number): Promise<void> {
    const game = this.games.get(id);
    if (game) {
      this.games.set(id, { ...game, lastActive: new Date() });
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
}

export const storage = new MemStorage();