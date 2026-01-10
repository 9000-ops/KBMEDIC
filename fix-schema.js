/**
 * Fix database schema
 */

const db = require('./database');

async function fixSchema() {
  console.log('Fixing database schema...\n');
  
  try {
    // Add user_id column to orders
    await db.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)
    `);
    console.log('✓ Added user_id column to orders');
    
    // Update orders route to use correct column names
    console.log('\n✓ Schema fix completed');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

fixSchema();
