# Yjs Integration for Codevo

This document describes the Yjs integration that enables real-time collaborative editing with file persistence across the Codevo platform.

## Architecture Overview

```
Frontend (React) ←→ Yjs Server ←→ Runner Container ←→ Worker Container ←→ S3 Storage
```

### Components

1. **Frontend**: React app with Monaco Editor and Yjs client
2. **Yjs Server**: Centralized Yjs WebSocket server (wss://yjs.codevo.dev)
3. **Runner Container**: Manages file system and syncs with Yjs
4. **Worker Container**: Persists file changes to S3 storage

## Flow Description

### 1. Pod Creation & Initial Connection
When a pod with 2 containers (runner + worker) is created:

1. Frontend connects to runner via Socket.IO
2. Frontend joins Yjs room using projectId as roomId
3. Runner joins the same Yjs room
4. Runner sends initial file structure from `/workspace` volume to frontend

### 2. File Synchronization
- **Initial Sync**: Runner checks if Yjs room has files or workspace has files
  - If Yjs is empty: Sync workspace files to Yjs
  - If Yjs has files: Sync Yjs files to workspace
- **Real-time Sync**: All changes are synchronized in real-time via Yjs

### 3. Change Persistence
When Yjs document changes occur:
1. Runner detects changes via Yjs observers
2. Runner forwards changes to worker container
3. Worker persists changes to S3 storage

## Implementation Details

### Frontend (CodeEditorPanel.tsx)
- Connects to Yjs server using `WebsocketProvider`
- Uses `MonacoBinding` to sync Monaco Editor with Yjs
- Joins room using `projectId` as roomId

### Runner (yjsSyncManager.ts)
- Manages Yjs room connections
- Handles file system operations
- Forwards changes to worker
- Syncs workspace with Yjs documents

### Worker (index.ts)
- Receives Yjs events from runner
- Persists file changes to S3
- Supports file creation, modification, and deletion

## Environment Variables

### Runner Container
```env
PORT=3000
WORKSPACE_PATH=/workspace
YJS_SERVER_URL=wss://yjs.codevo.dev
WORKER_URL=http://worker:3001
```

### Worker Container
```env
PORT=3001
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
S3_BUCKET_NAME=codevo-workspaces
```

## API Endpoints

### Runner Socket.IO Events
- `yjs:joinRoom` - Join Yjs room
- `yjs:leaveRoom` - Leave Yjs room
- `files:getStructure` - Get file structure
- `files:create` - Create file/folder
- `files:delete` - Delete file/folder
- `files:rename` - Rename file/folder
- `files:getContent` - Get file content
- `files:saveContent` - Save file content

### Worker HTTP Endpoints
- `POST /yjs-events` - Handle Yjs events from runner
- `GET /health` - Health check
- `GET /workspace/:roomId` - Get workspace files (future)

## File Structure in S3
```
codevo-workspaces/
├── project-id-1/
│   ├── main.js
│   ├── utils.js
│   └── styles.css
└── project-id-2/
    ├── index.html
    └── app.js
```

## Error Handling

- Network failures are handled gracefully
- File system errors are logged and reported
- S3 upload failures are retried
- Yjs connection issues trigger reconnection

## Security Considerations

- Yjs rooms are isolated by projectId
- File access is restricted to project scope
- S3 bucket policies should restrict access
- Environment variables should be properly secured

## Monitoring & Logging

### Runner Logs
- `[yjs]` - Yjs-related operations
- `[socket.io]` - Socket.IO connections
- File system operations

### Worker Logs
- `[worker]` - Worker operations
- S3 upload/download operations
- Error handling

## Future Enhancements

1. **File Versioning**: Track file versions in S3
2. **Conflict Resolution**: Handle merge conflicts
3. **Offline Support**: Cache files locally
4. **Performance Optimization**: Batch file operations
5. **Analytics**: Track collaboration metrics 