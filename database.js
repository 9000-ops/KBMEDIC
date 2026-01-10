const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_lJYpH4e9BQhT@ep-raspy-paper-ah2rqdbq-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Query error:', { text: text.substring(0, 50), error: error.message });
    throw error;
  }
};

// Get client for transactions
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

const connect = async () => {
  try {
    const client = await pool.connect();
    console.log('✓ PostgreSQL Connected to Neon Database');
    client.release();
    return true;
  } catch (error) {
    console.error('✗ PostgreSQL Connection Error:', error.message);
    return false;
  }
};

module.exports = {
  query,
  getClient,
  connect,
  pool
};
