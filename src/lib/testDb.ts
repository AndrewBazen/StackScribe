// Test file to diagnose database issues
import { getDb } from './db';

export async function testDatabase() {
  try {
    console.log('🧪 Testing database connection...');
    
    const db = await getDb();
    console.log('✅ Database connection successful');
    
    // Test basic query
    const result = await db.select('SELECT 1 as test');
    console.log('✅ Basic query works:', result);
    
    // Check database schema
    const schema = await db.select(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    console.log('📋 Database schema:', schema);
    
    // Try inserting test data
    const testId = 'test-' + Date.now();
    await db.execute(`
      INSERT INTO archives (id, name, description, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?)
    `, [testId, 'Test Archive', 'Test Description', new Date().toISOString(), new Date().toISOString()]);
    
    console.log('✅ Test insert successful');
    
    // Try reading test data
    const archives = await db.select('SELECT * FROM archives WHERE id = ?', [testId]);
    console.log('✅ Test read successful:', archives);
    
    // Clean up
    await db.execute('DELETE FROM archives WHERE id = ?', [testId]);
    console.log('✅ Test cleanup successful');
    
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return false;
  }
}
