// Example Rust server implementation for StackScribe sync
// Save this as main.rs in your server project

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use tower_http::cors::CorsLayer;
use uuid::Uuid;

// Data structures matching your client-side types
#[derive(Debug, Serialize, Deserialize, Clone)]
struct Archive {
    id: String,
    name: String,
    description: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Tome {
    id: String,
    archive_id: String,
    name: String,
    description: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Entry {
    id: String,
    tome_id: String,
    title: String,
    content: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
struct SyncResponse {
    archives: Vec<Archive>,
    tomes: Vec<Tome>,
    entries: Vec<Entry>,
    #[serde(rename = "lastModified")]
    last_modified: String,
}

#[derive(Debug, Deserialize)]
struct SyncRequest {
    archives: Vec<Archive>,
    tomes: Vec<Tome>,
    entries: Vec<Entry>,
}

#[derive(Debug, Deserialize)]
struct SyncQuery {
    since: Option<String>,
}

// For now, we'll use a hardcoded user_id until you implement auth
const TEMP_USER_ID: &str = "temp-user-123";

// GET /api/sync - Download changes since timestamp
async fn get_sync(
    Query(params): Query<SyncQuery>,
    State(pool): State<PgPool>,
) -> Result<Json<SyncResponse>, StatusCode> {
    let since_timestamp = params.since.unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string());
    
    // Get archives
    let archives = sqlx::query(
        "SELECT id, name, description, created_at, updated_at 
         FROM archives 
         WHERE user_id = $1 AND updated_at > $2 
         ORDER BY updated_at DESC"
    )
    .bind(TEMP_USER_ID)
    .bind(&since_timestamp)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .into_iter()
    .map(|row| Archive {
        id: row.get("id"),
        name: row.get("name"),
        description: row.get("description"),
        created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
        updated_at: row.get::<DateTime<Utc>, _>("updated_at").to_rfc3339(),
    })
    .collect();

    // Get tomes
    let tomes = sqlx::query(
        "SELECT id, archive_id, name, description, created_at, updated_at 
         FROM tomes 
         WHERE user_id = $1 AND updated_at > $2 
         ORDER BY updated_at DESC"
    )
    .bind(TEMP_USER_ID)
    .bind(&since_timestamp)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .into_iter()
    .map(|row| Tome {
        id: row.get("id"),
        archive_id: row.get("archive_id"),
        name: row.get("name"),
        description: row.get("description"),
        created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
        updated_at: row.get::<DateTime<Utc>, _>("updated_at").to_rfc3339(),
    })
    .collect();

    // Get entries
    let entries = sqlx::query(
        "SELECT id, tome_id, title, content, created_at, updated_at 
         FROM entries 
         WHERE user_id = $1 AND updated_at > $2 
         ORDER BY updated_at DESC"
    )
    .bind(TEMP_USER_ID)
    .bind(&since_timestamp)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .into_iter()
    .map(|row| Entry {
        id: row.get("id"),
        tome_id: row.get("tome_id"),
        title: row.get("title"),
        content: row.get("content"),
        created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
        updated_at: row.get::<DateTime<Utc>, _>("updated_at").to_rfc3339(),
    })
    .collect();

    Ok(Json(SyncResponse {
        archives,
        tomes,
        entries,
        last_modified: Utc::now().to_rfc3339(),
    }))
}

// POST /api/sync - Upload local changes
async fn post_sync(
    State(pool): State<PgPool>,
    Json(payload): Json<SyncRequest>,
) -> Result<Json<HashMap<String, String>>, StatusCode> {
    let mut tx = pool.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Upsert archives
    for archive in payload.archives {
        let created_at: DateTime<Utc> = archive.created_at.parse().map_err(|_| StatusCode::BAD_REQUEST)?;
        let updated_at: DateTime<Utc> = archive.updated_at.parse().map_err(|_| StatusCode::BAD_REQUEST)?;
        
        sqlx::query(
            "INSERT INTO archives (id, user_id, name, description, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) 
             DO UPDATE SET 
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               updated_at = EXCLUDED.updated_at
             WHERE archives.updated_at < EXCLUDED.updated_at"
        )
        .bind(&archive.id)
        .bind(TEMP_USER_ID)
        .bind(&archive.name)
        .bind(&archive.description)
        .bind(created_at)
        .bind(updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Upsert tomes
    for tome in payload.tomes {
        let created_at: DateTime<Utc> = tome.created_at.parse().map_err(|_| StatusCode::BAD_REQUEST)?;
        let updated_at: DateTime<Utc> = tome.updated_at.parse().map_err(|_| StatusCode::BAD_REQUEST)?;
        
        sqlx::query(
            "INSERT INTO tomes (id, archive_id, user_id, name, description, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) 
             DO UPDATE SET 
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               updated_at = EXCLUDED.updated_at
             WHERE tomes.updated_at < EXCLUDED.updated_at"
        )
        .bind(&tome.id)
        .bind(&tome.archive_id)
        .bind(TEMP_USER_ID)
        .bind(&tome.name)
        .bind(&tome.description)
        .bind(created_at)
        .bind(updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Upsert entries
    for entry in payload.entries {
        let created_at: DateTime<Utc> = entry.created_at.parse().map_err(|_| StatusCode::BAD_REQUEST)?;
        let updated_at: DateTime<Utc> = entry.updated_at.parse().map_err(|_| StatusCode::BAD_REQUEST)?;
        
        sqlx::query(
            "INSERT INTO entries (id, tome_id, user_id, title, content, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) 
             DO UPDATE SET 
               title = EXCLUDED.title,
               content = EXCLUDED.content,
               updated_at = EXCLUDED.updated_at
             WHERE entries.updated_at < EXCLUDED.updated_at"
        )
        .bind(&entry.id)
        .bind(&entry.tome_id)
        .bind(TEMP_USER_ID)
        .bind(&entry.title)
        .bind(&entry.content)
        .bind(created_at)
        .bind(updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    tx.commit().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut response = HashMap::new();
    response.insert("success".to_string(), "true".to_string());
    response.insert("lastModified".to_string(), Utc::now().to_rfc3339());

    Ok(Json(response))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to PostgreSQL
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://username:password@localhost/stackscribe".to_string());
    
    let pool = PgPool::connect(&database_url).await?;

    // Run migrations
    println!("🔄 Running database migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;
    println!("✅ Migrations completed");

    // Create test user if it doesn't exist (for development)
    let _ = sqlx::query(
        "INSERT INTO users (id, username, email, password_hash) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (id) DO NOTHING"
    )
    .bind(TEMP_USER_ID)
    .bind("test_user")
    .bind("test@example.com")
    .bind("temp_hash") // In production, use proper password hashing
    .execute(&pool)
    .await;

    // Build our application with routes
    let app = Router::new()
        .route("/api/sync", get(get_sync))
        .route("/api/sync", post(post_sync))
        .layer(CorsLayer::permissive()) // Allow CORS for your frontend
        .with_state(pool);

    // Run the server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    println!("🚀 Server running on http://0.0.0.0:3000");
    
    axum::serve(listener, app).await?;

    Ok(())
}
