// src/lib/initDb.ts
import { getDb } from './db';

export async function initDb() {
  try {
    console.log('🔄 Connecting to database...');
    const db = await getDb();
    
    // Test the connection by running a simple query
    await db.select('SELECT 1');
    console.log('✅ Database connection verified');
    
    // Check if tables exist (migrations should have created them)
    const tables = await db.select(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('archives', 'tomes', 'entries', 'user_settings', 'user_metadata')
    `) as { name: string }[];
    
    console.log('📋 Available tables:', tables);
    
    if (tables.length < 5) {
      console.warn('⚠️ Some tables may be missing. Check Rust migrations.');
    }
    
    console.log('✅ Database initialization completed');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}
