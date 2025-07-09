import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function health(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    context.info('🔍 Health check requested');
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      context.info('✅ Handling OPTIONS preflight request for health check');
      return {
        status: 200,
        headers: corsHeaders
      };
    }

    return {
      status: 200,
      headers: corsHeaders,
      jsonBody: { 
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        sqlServer: process.env.AZURE_SQL_SERVER ? "configured" : "missing",
        sqlDatabase: process.env.AZURE_SQL_DATABASE ? "configured" : "missing"
      }
    };

  } catch (error) {
    context.error('❌ Health check error:', error);
    return {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      jsonBody: { 
        status: "error",
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('health', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: health
});
