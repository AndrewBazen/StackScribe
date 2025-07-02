import Database from '@tauri-apps/plugin-sql';

export const getDb = async () => {
  try {
    // Use absolute path in app data directory
    const db = await Database.load('sqlite:stackscribe.db');
    console.log('✅ Database connected successfully');
    return db;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}
