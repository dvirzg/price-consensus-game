import { Game, InsertGame, Item, InsertItem, Participant, InsertParticipant } from "@shared/schema";

export interface IStorage {
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  updateGameStatus(id: number, status: string): Promise<void>;
  updateGameLastActive(id: number): Promise<void>;
  
  createItem(gameId: number, item: InsertItem): Promise<Item>;
  getGameItems(gameId: number): Promise<Item[]>;
  updateItemPrice(id: number, price: number): Promise<void>;
  
  createParticipant(gameId: number, participant: InsertParticipant): Promise<Participant>;
  getGameParticipants(gameId: number): Promise<Participant[]>;
}

export class MemStorage implements IStorage {
  private games: Map<number, Game>;
  private items: Map<number, Item>;
  private participants: Map<number, Participant>;
  private currentGameId: number;
  private currentItemId: number;
  private currentParticipantId: number;

  constructor() {
    this.games = new Map();
    this.items = new Map();
    this.participants = new Map();
    this.currentGameId = 1;
    this.currentItemId = 1;
    this.currentParticipantId = 1;
  }

  async createGame(game: InsertGame): Promise<Game> {
    const id = this.currentGameId++;
    const newGame: Game = {
      ...game,
      id,
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

  async updateGameStatus(id: number, status: string): Promise<void> {
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
    const newItem: Item = { ...item, id, gameId };
    this.items.set(id, newItem);
    return newItem;
  }

  async getGameItems(gameId: number): Promise<Item[]> {
    return Array.from(this.items.values()).filter(item => item.gameId === gameId);
  }

  async updateItemPrice(id: number, price: number): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      this.items.set(id, { ...item, currentPrice: price });
    }
  }

  async createParticipant(gameId: number, participant: InsertParticipant): Promise<Participant> {
    const id = this.currentParticipantId++;
    const newParticipant: Participant = { ...participant, id, gameId };
    this.participants.set(id, newParticipant);
    return newParticipant;
  }

  async getGameParticipants(gameId: number): Promise<Participant[]> {
    return Array.from(this.participants.values()).filter(p => p.gameId === gameId);
  }
}

export const storage = new MemStorage();
