-- Create participants table first (since games references it)
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  game_id INTEGER,
  name TEXT NOT NULL,
  email TEXT
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  creator_id INTEGER REFERENCES participants(id)
);

-- Add foreign key to participants after games table exists
ALTER TABLE participants
ADD CONSTRAINT fk_game
FOREIGN KEY (game_id) REFERENCES games(id);

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id),
  title TEXT NOT NULL,
  image_data TEXT NOT NULL,
  current_price DECIMAL(10,2) NOT NULL
);

-- Create item_assignments table
CREATE TABLE IF NOT EXISTS item_assignments (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  game_id INTEGER NOT NULL REFERENCES games(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
); 