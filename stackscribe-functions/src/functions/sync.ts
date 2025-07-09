import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Connection, Request, TYPES, ConnectionConfiguration } from 'tedious';
import { DefaultAzureCredential } from '@azure/identity';

interface Archive {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Tome {
  id: string;
  archive_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Entry {
  id: string;
  tome_id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function sync(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const startTime = Date.now();
  
  try {
    context.info('🔍 Function started, method:', request.method);
    
    // CORS headers for development
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      context.info('✅ Handling OPTIONS preflight request');
      return {
        status: 200,
        headers: corsHeaders
      };
    }

    // Get and validate authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      context.warn('❌ Missing or invalid authorization header');
      return {
        status: 401,
        headers: corsHeaders,
        jsonBody: { error: "Missing or invalid authorization header" }
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Parse JWT to get user ID (simple base64 decode for now)
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub || payload.oid || payload.preferred_username;
      
      if (!userId) {
        throw new Error('No user identifier found in token');
      }
      
      context.info(`👤 User ID extracted from token: ${userId}`);
    } catch (tokenError) {
      context.error('❌ Token parsing error:', tokenError);
      return {
        status: 401,
        headers: corsHeaders,
        jsonBody: { error: "Invalid token format" }
      };
    }

    // Route based on HTTP method
    if (request.method === "POST") {
      context.info('📤 Handling sync upload (POST)');
      return await handleSyncUpload(request, context, userId, corsHeaders);
    } else if (request.method === "GET") {
      context.info('📥 Handling sync download (GET)');
      return await handleSyncDownload(context, userId, corsHeaders);
    } else {
      return {
        status: 405,
        headers: corsHeaders,
        jsonBody: { error: `Method ${request.method} not allowed` }
      };
    }

  } catch (error) {
    context.error('❌ Function error:', error);
    return {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      jsonBody: { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  } finally {
    const duration = Date.now() - startTime;
    context.info(`⏱️ Function completed in ${duration}ms`);
  }
}

async function handleSyncUpload(
  request: HttpRequest, 
  context: InvocationContext, 
  userId: string, 
  corsHeaders: Record<string, string>
): Promise<HttpResponseInit> {
  let requestBody: any;
  
  try {
    requestBody = await request.json();
  } catch (parseError) {
    context.error('Request body parsing error:', parseError);
    return {
      status: 400,
      headers: corsHeaders,
      jsonBody: { error: "Invalid JSON in request body" }
    };
  }

  if (!requestBody?.data) {
    return {
      status: 400,
      headers: corsHeaders,
      jsonBody: { error: "Invalid request body - missing data" }
    };
  }

  const { archives, tomes, entries } = requestBody.data;
  
  let connection: Connection | null = null;
  
  try {
    connection = await createConnection();
    context.info('✅ Database connection established');
    
    // Use transaction for data consistency
    await executeQuery(connection, "BEGIN TRANSACTION");
    context.info('📊 Transaction started');
    
    // Sync archives
    if (archives?.length > 0) {
      await syncArchives(connection, archives, userId, context);
    }
    
    // Sync tomes
    if (tomes?.length > 0) {
      await syncTomes(connection, tomes, userId, context);
    }
    
    // Sync entries
    if (entries?.length > 0) {
      await syncEntries(connection, entries, userId, context);
    }
    
    await executeQuery(connection, "COMMIT TRANSACTION");
    context.info('✅ Transaction committed successfully');
    
    return {
      status: 200,
      headers: corsHeaders,
      jsonBody: { 
        success: true, 
        message: "Sync upload completed successfully",
        synced: {
          archives: archives?.length || 0,
          tomes: tomes?.length || 0,
          entries: entries?.length || 0
        }
      }
    };
    
  } catch (error) {
    context.error('❌ Database operation failed:', error);
    
    if (connection) {
      try {
        await executeQuery(connection, "ROLLBACK TRANSACTION");
        context.info('🔄 Transaction rolled back');
      } catch (rollbackError) {
        context.error('❌ Rollback failed:', rollbackError);
      }
    }
    
    // Return a more specific error
    return {
      status: 500,
      headers: corsHeaders,
      jsonBody: { 
        error: "Database operation failed",
        details: error instanceof Error ? error.message : 'Unknown database error'
      }
    };
  } finally {
    if (connection) {
      connection.close();
    }
  }
}

async function handleSyncDownload(
  context: InvocationContext, 
  userId: string, 
  corsHeaders: Record<string, string>
): Promise<HttpResponseInit> {
  let connection: Connection | null = null;
  
  try {
    connection = await createConnection();
    context.info('✅ Database connection established for download');
    
    // Execute each query separately to avoid connection state issues
    const archives = await queryData(connection, "SELECT * FROM archives WHERE user_id = @userId", { userId });
    context.info(`📊 Found ${archives.length} archives for user ${userId}`);
    
    // Close and recreate connection for next query to avoid state issues
    connection.close();
    connection = await createConnection();
    
    const tomes = await queryData(connection, "SELECT * FROM tomes WHERE user_id = @userId", { userId });
    context.info(`📊 Found ${tomes.length} tomes for user ${userId}`);
    
    // Close and recreate connection for final query
    connection.close();
    connection = await createConnection();
    
    const entries = await queryData(connection, "SELECT * FROM entries WHERE user_id = @userId", { userId });
    context.info(`📊 Found ${entries.length} entries for user ${userId}`);
    
    context.info(`Downloaded sync data for user ${userId}: ${archives.length} archives, ${tomes.length} tomes, ${entries.length} entries`);
    
    return {
      status: 200,
      headers: corsHeaders,
      jsonBody: {
        success: true,
        data: { archives, tomes, entries }
      }
    };
    
  } catch (error) {
    context.error('❌ Database download failed:', error);
    
    // Return a more specific error
    return {
      status: 500,
      headers: corsHeaders,
      jsonBody: { 
        error: "Database download failed",
        details: error instanceof Error ? error.message : 'Unknown database error'
      }
    };
  } finally {
    if (connection) {
      try {
        connection.close();
      } catch (closeError) {
        context.warn('⚠️ Error closing connection:', closeError);
      }
    }
  }
}

async function createConnection(): Promise<Connection> {
  try {
    // Get access token using managed identity
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://database.windows.net/');
    
    const config: ConnectionConfiguration = {
      server: process.env.AZURE_SQL_SERVER!,
      authentication: {
        type: 'azure-active-directory-access-token',
        options: {
          token: tokenResponse.token,
        }
      },
      options: {
        database: process.env.AZURE_SQL_DATABASE!,
        encrypt: true,
        rowCollectionOnRequestCompletion: true,
        connectTimeout: 15000, // Reduced timeout
        requestTimeout: 15000, // Reduced timeout
        trustServerCertificate: false,
        enableArithAbort: true,
        connectionRetryInterval: 200,
        maxRetriesOnTransientErrors: 2,
        // Disable connection pooling completely for now
        enableAnsiNullDefault: true,
        cancelTimeout: 5000
      }
    };

    return new Promise((resolve, reject) => {
      const connection = new Connection(config);
      
      let isResolved = false;
      
      connection.on('connect', (err) => {
        if (isResolved) return;
        isResolved = true;
        
        if (err) {
          reject(new Error(`Connection failed: ${err.message}`));
        } else {
          resolve(connection);
        }
      });
      
      connection.on('error', (err) => {
        if (isResolved) return;
        isResolved = true;
        reject(new Error(`Connection error: ${err.message}`));
      });
      
      // Add timeout with cleanup
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          connection.close();
          reject(new Error('Connection timeout after 15 seconds'));
        }
      }, 15000);
      
      // Clear timeout if connection succeeds
      connection.on('connect', () => {
        clearTimeout(timeoutId);
      });
      
      connection.connect();
    });
  } catch (error) {
    throw new Error(`Failed to create connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function syncArchives(connection: Connection, archives: Archive[], userId: string, context: InvocationContext): Promise<void> {
  const sql = `
    MERGE archives AS target
    USING (SELECT @id as id, @name as name, @description as description, @created_at as created_at, @updated_at as updated_at, @user_id as user_id) AS source
    ON target.id = source.id AND target.user_id = source.user_id
    WHEN MATCHED THEN 
      UPDATE SET name = source.name, description = source.description, updated_at = source.updated_at
    WHEN NOT MATCHED THEN
      INSERT (id, name, description, created_at, updated_at, user_id)
      VALUES (source.id, source.name, source.description, source.created_at, source.updated_at, source.user_id);
  `;

  for (const archive of archives) {
    await executeQuery(connection, sql, {
      id: archive.id,
      name: archive.name,
      description: archive.description || null,
      created_at: archive.created_at,
      updated_at: archive.updated_at,
      user_id: userId
    });
  }
  
  context.info(`Synced ${archives.length} archives for user ${userId}`);
}

async function syncTomes(connection: Connection, tomes: Tome[], userId: string, context: InvocationContext): Promise<void> {
  const sql = `
    MERGE tomes AS target
    USING (SELECT @id as id, @archive_id as archive_id, @name as name, @description as description, @created_at as created_at, @updated_at as updated_at, @user_id as user_id) AS source
    ON target.id = source.id AND target.user_id = source.user_id
    WHEN MATCHED THEN 
      UPDATE SET archive_id = source.archive_id, name = source.name, description = source.description, updated_at = source.updated_at
    WHEN NOT MATCHED THEN
      INSERT (id, archive_id, name, description, created_at, updated_at, user_id)
      VALUES (source.id, source.archive_id, source.name, source.description, source.created_at, source.updated_at, source.user_id);
  `;

  for (const tome of tomes) {
    await executeQuery(connection, sql, {
      id: tome.id,
      archive_id: tome.archive_id,
      name: tome.name,
      description: tome.description || null,
      created_at: tome.created_at,
      updated_at: tome.updated_at,
      user_id: userId
    });
  }
  
  context.info(`Synced ${tomes.length} tomes for user ${userId}`);
}

async function syncEntries(connection: Connection, entries: Entry[], userId: string, context: InvocationContext): Promise<void> {
  const sql = `
    MERGE entries AS target
    USING (SELECT @id as id, @tome_id as tome_id, @name as name, @content as content, @created_at as created_at, @updated_at as updated_at, @user_id as user_id) AS source
    ON target.id = source.id AND target.user_id = source.user_id
    WHEN MATCHED THEN 
      UPDATE SET tome_id = source.tome_id, name = source.name, content = source.content, updated_at = source.updated_at
    WHEN NOT MATCHED THEN
      INSERT (id, tome_id, name, content, created_at, updated_at, user_id)
      VALUES (source.id, source.tome_id, source.name, source.content, source.created_at, source.updated_at, source.user_id);
  `;

  for (const entry of entries) {
    await executeQuery(connection, sql, {
      id: entry.id,
      tome_id: entry.tome_id,
      name: entry.name,
      content: entry.content,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      user_id: userId
    });
  }
  
  context.info(`Synced ${entries.length} entries for user ${userId}`);
}

async function executeQuery(connection: Connection, sql: string, parameters: Record<string, any> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new Request(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });

    // Add parameters with proper type mapping
    Object.entries(parameters).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        request.addParameter(key, TYPES.NVarChar, null);
      } else if (typeof value === 'string') {
        request.addParameter(key, TYPES.NVarChar, value);
      } else if (value instanceof Date) {
        request.addParameter(key, TYPES.DateTime2, value);
      } else {
        request.addParameter(key, TYPES.NVarChar, String(value));
      }
    });

    connection.execSql(request);
  });
}

async function queryData(connection: Connection, sql: string, parameters: Record<string, any> = {}): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    const request = new Request(sql, (err) => {
      if (err) reject(err);
      else resolve(results);
    });

    request.on('row', (columns) => {
      const row: any = {};
      columns.forEach((column: { metadata: { colName: string | number; }; value: any; }) => {
        row[column.metadata.colName] = column.value;
      });
      results.push(row);
    });

    // Add parameters with proper type mapping
    Object.entries(parameters).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        request.addParameter(key, TYPES.NVarChar, null);
      } else if (typeof value === 'string') {
        request.addParameter(key, TYPES.NVarChar, value);
      } else if (value instanceof Date) {
        request.addParameter(key, TYPES.DateTime2, value);
      } else {
        request.addParameter(key, TYPES.NVarChar, String(value));
      }
    });

    connection.execSql(request);
  });
}

// Register the function
app.http('sync', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: sync
});