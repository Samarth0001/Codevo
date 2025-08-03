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

// AWS S3/R2 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
  endpoint: process.env.R2_ENDPOINT || undefined // For R2, this would be your R2 endpoint
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'codevo';

// Handle file persistence from runner
app.post('/persist', (req, res) => {
  (async () => {
    try {
      const { projectId, path, content, event = 'file:modified' } = req.body;
      
      console.log(`[worker] Received ${event} for project ${projectId}, file: ${path}`);

      if (!path) {
        console.warn(`[worker] No path found in request:`, req.body);
        return res.status(400).json({ error: 'Path is required' });
      }

      if (!projectId) {
        console.warn(`[worker] No projectId found in request:`, req.body);
        return res.status(400).json({ error: 'ProjectId is required' });
      }

      // Immediately persist to storage
      try {
        switch (event) {
          case 'file:created':
          case 'file:modified':
            await persistFileToStorage(projectId, path, content);
            break;
          case 'file:deleted':
            await deleteFileFromStorage(projectId, path);
            break;
          default:
            console.warn(`[worker] Unknown event type: ${event}`);
            return res.status(400).json({ error: `Unknown event type: ${event}` });
        }
        
        console.log(`[worker] Successfully processed ${event} for ${path}`);
        res.status(200).json({ success: true, message: `${event} processed successfully` });
      } catch (storageError: any) {
        console.error(`[worker] Storage error for ${event} ${path}:`, storageError);
        res.status(500).json({ error: 'Storage operation failed', details: storageError.message });
      }

    } catch (error) {
      console.error('[worker] Error processing persist request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  })();
});

async function persistFileToStorage(projectId: string, filePath: string, content: string) {
  const key = `Project_Code/${projectId}/${filePath}`;
  
  console.log(`[worker] Persisting file to storage: ${key}`);
  console.log(`[worker] Content length: ${content.length} characters`);
  
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: getContentType(filePath),
      Metadata: {
        'project-id': projectId,
        'file-path': filePath,
        'persisted-at': new Date().toISOString(),
      },
    });

    await s3Client.send(command);
    console.log(`[worker] File successfully persisted to storage: ${key}`);
  } catch (error) {
    console.error(`[worker] Error persisting file to storage: ${key}`, error);
    throw error;
  }
}

async function deleteFileFromStorage(projectId: string, filePath: string) {
  const key = `Project_Code/${projectId}/${filePath}`;
  
  console.log(`[worker] Deleting file from storage: ${key}`);
  
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`[worker] File successfully deleted from storage: ${key}`);
  } catch (error) {
    console.error(`[worker] Error deleting file from storage: ${key}`, error);
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
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    bucket: BUCKET_NAME,
    endpoint: process.env.S3_ENDPOINT || 'default',
    region: process.env.AWS_REGION || 'auto'
  });
});

// Test endpoint for manual testing
app.post('/test', (req, res) => {
  (async () => {
    try {
      const { projectId, path, content } = req.body;
      console.log(`[worker] Test request: projectId=${projectId}, path=${path}`);
      
      await persistFileToStorage(projectId, path, content);
      res.status(200).json({ success: true, message: 'Test file persisted successfully' });
    } catch (error: any) {
      console.error('[worker] Test failed:', error);
      res.status(500).json({ error: 'Test failed', details: error.message });
    }
  })();
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Worker service running on port ${PORT}`);
  console.log(`S3/R2 Bucket: ${BUCKET_NAME}`);
  console.log(`S3/R2 Endpoint: ${process.env.S3_ENDPOINT || 'default'}`);
  console.log(`Region: ${process.env.AWS_REGION || 'auto'}`);
});
