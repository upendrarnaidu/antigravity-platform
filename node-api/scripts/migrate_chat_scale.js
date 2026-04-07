require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/marketing_platform';
const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  try {
    // 1. Add token_balance to users
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 100000;
    `);

    // 2. Create Chat Sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) DEFAULT 'New Chat',
        archived BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Chat Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create Token Usage History table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_usage_history (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
        model VARCHAR(100),
        tokens_used INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Successfully completed scalability and chat database migrations.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
