# Docker Container Startup Integration

This document describes how the AI service containers are automatically started when the StackScribe app launches.

## 🚀 **Auto-Startup Flow**

### 1. **App Initialization**
When the Tauri app starts, the `setup` function automatically:
- Waits 2 seconds for app initialization
- Checks if Docker is available
- Attempts to start AI service containers
- Emits startup status events to the frontend

### 2. **Container Management**
The system manages two Docker containers:
- **Qdrant**: Vector database (port 6333)
- **AI Service**: Link suggestion API (port 8000)

### 3. **User Feedback**
- **Startup Notification**: Appears in top-right corner
- **Service Manager**: Detailed status in preferences
- **Console Logs**: Technical details for debugging

## 🔧 **Technical Implementation**

### Backend (Rust/Tauri)

**Files Modified:**
- `src-tauri/src/lib.rs` - Added startup hooks and container management
- `src-tauri/Cargo.toml` - Added reqwest for HTTP health checks

**Key Functions:**
```rust
startup_ai_service()          // Auto-start on app launch
start_ai_service_internal()   // Internal startup logic
check_containers_status()     // Docker container verification
```

**Events Emitted:**
- `ai-service-startup` - Status updates to frontend

### Frontend (React/TypeScript)

**New Components:**
- `StartupNotification.tsx` - Floating notification for startup status
- `StartupNotification.css` - Notification styling

**Modified Components:**
- `App.tsx` - Added StartupNotification component
- `AIServiceManager.tsx` - Enhanced with startup status display

**Event Handling:**
- Listens for `ai-service-startup` events
- Auto-dismisses successful notifications after 5s
- Provides manual dismiss for error states

### Docker Configuration

**Files:**
- `docker-compose.yml` - Service orchestration
- `Dockerfile` - AI service container
- `docker-start.sh` - Startup script with health checks
- `.dockerignore` - Build optimization

## 📋 **Startup Scenarios**

### ✅ **Success Scenario**
1. Docker is available
2. Containers start successfully
3. Health checks pass
4. Green notification appears
5. Services ready for use

### ⚠️ **Warning Scenario**
1. Docker not installed/running
2. Port conflicts detected
3. Orange notification appears
4. Manual start option available

### ❌ **Error Scenario**
1. Container build/start fails
2. Health checks timeout
3. Red notification appears
4. Error details provided

## 🎛️ **User Controls**

### Automatic Features
- ✅ **Auto-start on app launch**
- ✅ **Health monitoring**
- ✅ **Error handling**
- ✅ **Visual feedback**

### Manual Controls
- 🔲 **Start Service** - Manual container startup
- 🛑 **Stop Service** - Graceful container shutdown
- 🔄 **Refresh Status** - Force status check
- ⚙️ **Service Manager** - Detailed control panel

## 🛠️ **Configuration**

### Environment Variables
Configurable via `docker-compose.yml`:
```yaml
environment:
  - QDRANT_HOST=qdrant
  - EMBED_MODEL=nomic-ai/nomic-embed-text-v1
  - RERANKER_ID=BAAI/bge-reranker-base
  - THRESHOLD=0.05
  - TOP_K=8
```

### Startup Timing
- **Delay**: 2 seconds after app launch
- **Timeout**: 30 seconds for health checks
- **Retries**: 3 attempts with exponential backoff

## 🔍 **Monitoring & Debugging**

### Status Endpoints
- **Qdrant**: `http://localhost:6333/health`
- **AI Service**: `http://localhost:8000/health`

### Logs
```bash
# View container logs
docker-compose logs -f

# View individual service logs
docker-compose logs ai-service
docker-compose logs qdrant
```

### Console Output
Check the Tauri console for detailed startup information:
```
🚀 Starting AI service on app startup...
✅ Docker is available, starting AI service...
🤖 AI service startup initiated
```

## 🎯 **Benefits**

1. **Seamless UX**: No manual setup required
2. **Intelligent Fallback**: Graceful handling when Docker unavailable  
3. **Real-time Feedback**: Users know exactly what's happening
4. **Error Recovery**: Clear guidance when issues occur
5. **Performance**: Containers start in parallel with app initialization

## 🔄 **Lifecycle Management**

### App Start
- Containers auto-start
- Health monitoring begins
- Status notifications appear

### App Running
- Periodic health checks
- Manual control available
- Status always visible

### App Shutdown
- Containers remain running (optional)
- Graceful shutdown on manual stop
- State preserved for next launch

This integration provides a seamless, production-ready experience where AI capabilities are instantly available without user intervention! 🚀 