import express from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(
    cors({
        origin: '*',     
        credentials: true       
    })
);

// AWS S3 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true    
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'codevo';

interface YjsEvent {
  roomId: string;
  event: string;
  data: any;
  timestamp: number;
}

// At the top of worker/index.ts
const pendingUpdates = new Map(); // key: filePath, value: {event, data}
let flushTimeout:any = null;

function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(flushUpdates, 10000); // flush every 1s
}

async function flushUpdates() {
  for (const [filePath, {event, data}] of pendingUpdates.entries()) {
    // call handleFileCreated/Modified/Deleted as appropriate
  }
  pendingUpdates.clear();
  flushTimeout = null;
}

// Handle Yjs events from runner
app.post('/yjs-events', async (req, res) => {
  try {
    const { roomId, event, data, timestamp }: YjsEvent = req.body;
    
    console.log(`[worker] Received ${event} for room ${roomId}:`, data);

    switch (event) {
      case 'file:created':
        await handleFileCreated(roomId, data);
        break;
      
      case 'file:modified':
        await handleFileModified(roomId, data);
        break;
      
      case 'file:deleted':
        await handleFileDeleted(roomId, data);
        break;
      
      default:
        console.warn(`[worker] Unknown event type: ${event}`);
    }

    // In /yjs-events handler:
    pendingUpdates.set(data.filePath, {event, data});
    scheduleFlush();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[worker] Error processing Yjs event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleFileCreated(roomId: string, data: { filePath: string; content: string }) {
  const { filePath, content } = data;
  const key = `Project_Code/${roomId}/${filePath}`;
  
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: getContentType(filePath),
      Metadata: {
        'room-id': roomId,
        'file-path': filePath,
        'created-at': new Date().toISOString(),
      },
    });

    await s3Client.send(command);
    console.log(`[worker] File created in S3: ${key}`);
  } catch (error) {
    console.error(`[worker] Error creating file in S3: ${key}`, error);
    throw error;
  }
}

async function handleFileModified(roomId: string, data: { filePath: string; content: string }) {
  const { filePath, content } = data;
  const key = `Project_Code/${roomId}/${filePath}`;
  
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: getContentType(filePath),
      Metadata: {
        'room-id': roomId,
        'file-path': filePath,
        'modified-at': new Date().toISOString(),
      },
    });

    await s3Client.send(command);
    console.log(`[worker] File modified in S3: ${key}`);
  } catch (error) {
    console.error(`[worker] Error modifying file in S3: ${key}`, error);
    throw error;
  }
}

async function handleFileDeleted(roomId: string, data: { filePath: string }) {
  const { filePath } = data;
  const key = `Project_Code/${roomId}/${filePath}`;
  
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`[worker] File deleted from S3: ${key}`);
  } catch (error) {
    console.error(`[worker] Error deleting file from S3: ${key}`, error);
    throw error;
  }
}

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  const contentTypes: { [key: string]: string } = {
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'jsx': 'text/jsx',
    'tsx': 'text/tsx',
    'html': 'text/html',
    'css': 'text/css',
    'json': 'application/json',
    'md': 'text/markdown',
    'txt': 'text/plain',
    'py': 'text/x-python',
    'java': 'text/x-java-source',
    'cpp': 'text/x-c++src',
    'c': 'text/x-csrc',
    'php': 'text/x-php',
    'rb': 'text/x-ruby',
    'go': 'text/x-go',
    'rs': 'text/x-rust',
    'swift': 'text/x-swift',
    'kt': 'text/x-kotlin',
  };

  return contentTypes[ext || ''] || 'text/plain';
}

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get workspace files from S3
// app.get('/workspace/:roomId', async (req, res) => {
//   try {
//     const { roomId } = req.params;
    
//     // This would require listing objects with the roomId prefix
//     // For now, we'll return a simple response
//     res.status(200).json({ 
//       roomId, 
//       message: 'Workspace files endpoint - implement S3 listing logic here' 
//     });
//   } catch (error) {
//     console.error('[worker] Error getting workspace files:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Worker service running on port ${PORT}`);
  console.log(`S3 Bucket: ${BUCKET_NAME}`);
});
