# Price Consensus Game

A mobile-optimized web application for collaborative price allocation, designed with an iOS-style interface. Perfect for splitting costs among items when you know the total but need to determine individual prices through group consensus.

## Features

### Game Creation
- Create new bidding games by uploading item photos and titles
- Set a total price for all items combined
- Share game links with other participants
- Each game stays active for:
  - 48 hours after the last activity
  - 12 hours after consensus is reached

### Bidding Process
- Join existing games with unique usernames
- Bid on individual item prices iteratively
- Smart price balancing algorithm:
  - Allows overbidding on specific items
  - Automatically adjusts other items' prices to maintain the total sum
  - Real-time price updates across all participants

### Notifications
- Optional email notifications for price changes
- Stay updated on bidding progress
- Get notified when consensus is reached

## How to Play

1. **Start or Join a Game**
   - Create a new game by uploading items and setting total price
   - Or join an existing game via shared link
   - Choose your unique username

2. **Place Your Bids**
   - View all items and current price allocations
   - Submit your price estimates for items
   - Watch as prices adjust to maintain the total

3. **Reach Consensus**
   - Work with other players to find agreeable prices
   - Get notifications as prices change
   - Game completes when consensus is reached

## Try It Out
Visit [https://dvirzg.github.io/price-consensus-game](https://dvirzg.github.io/price-consensus-game) to start playing!

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