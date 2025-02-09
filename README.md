# Price Consensus Game

A fun multiplayer game where you and your friends work together to guess the prices of various items! Test your knowledge of market values and see how close you can get to reaching a consensus with other players.

## How to Play

1. **Start or Join a Game**
   - Visit [https://dvirzg.github.io/price-consensus-game](https://dvirzg.github.io/price-consensus-game)
   - Create a new game or join an existing one with a game code

2. **Gameplay**
   - Each player is assigned random items
   - Look at your items and estimate their prices
   - Submit your price estimates
   - Work with other players to reach a consensus
   - The closer your group gets to the actual prices, the higher your score!

3. **Scoring**
   - Points are awarded based on how close your group's consensus is to the actual prices
   - The more players agree on a price, the better your chances of success
   - Try to balance your own price knowledge with group consensus

## Tips
- Consider market prices and your personal experience
- Pay attention to other players' estimates
- Communication is key - discuss your reasoning with other players
- Don't be afraid to adjust your estimates based on group feedback

## Have Fun!
Gather your friends and see who has the best price intuition. Will you be the one to lead your group to price-guessing victory?

## Live Demo
- Frontend: [https://dvirzg.github.io/price-consensus-game](https://dvirzg.github.io/price-consensus-game)
- Backend: Hosted on Railway

## Tech Stack
- Frontend: React + Vite + TypeScript
- Backend: Express.js + TypeScript
- Deployment: GitHub Pages (frontend) + Railway (backend)

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/dvirzg/price-consensus-game.git
cd price-consensus-game
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
VITE_API_URL=http://localhost:5000
PORT=5000
NODE_ENV=development
```

4. Start development server:
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Deployment

- Frontend automatically deploys to GitHub Pages via GitHub Actions when pushing to main
- Backend deploys to Railway via Railway's GitHub integration 