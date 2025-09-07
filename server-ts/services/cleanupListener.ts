import Redis from 'ioredis';
import redis from '../utils/redisClient';
import Project from '../models/Project';

function startCleanupListener() {
  console.log('[CleanupListener] Starting Redis keyspace notification listener...');
  
  // Create a separate Redis client for subscription only
  const sub = new Redis({ 
    host: process.env.REDIS_HOST || 'redis', 
    port: 6379,
    maxRetriesPerRequest: 5,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    keepAlive: 30000,
    reconnectOnError: (err) => {
      console.log('[CleanupListener] Redis reconnect on error:', err.message);
      return true;
    },
  });

  sub.psubscribe('__keyevent@0__:expired', (err, count) => {
    if (err) {
      console.error('[CleanupListener] Error subscribing to keyspace notifications:', err);
    } else {
      console.log('[CleanupListener] Subscribed to Redis keyspace notifications');
    }
  });

  sub.on('pmessage', async (pattern, channel, message) => {
    console.log(`[CleanupListener] Received expired key: ${message}`);
    
    if (message.startsWith('active_project:')) {
      const projectId = message.split(':')[1];
      
      // Double-check that the project is really inactive before cleanup
      const projectKey = `active_project:${projectId}`;
      const usersKey = `active_project_users:${projectId}`;
      
      try {
        // Use the main redis client for checking project status
        const projectExists = await redis.exists(projectKey);
        const userCount = await redis.scard(usersKey);
        
        console.log(`[CleanupListener] Project ${projectId} check - exists: ${projectExists}, users: ${userCount}`);
        
        // Only cleanup if project key doesn't exist AND no users are present
        if (projectExists === 0 && userCount === 0) {
          console.log(`[CleanupListener] Project ${projectId} confirmed inactive, starting cleanup...`);
          await cleanupProject(projectId);
        } else {
          console.log(`[CleanupListener] Project ${projectId} still active or has users, skipping cleanup`);
        }
      } catch (error) {
        console.error(`[CleanupListener] Error checking project status for ${projectId}:`, error);
      }
    }
  });

  sub.on('error', (err) => {
    console.error('[CleanupListener] Redis subscription error:', err);
  });

  sub.on('connect', () => {
    console.log('[CleanupListener] Connected to Redis for cleanup monitoring');
  });
}

async function cleanupProject(projectId: string) {
  try {
    console.log(`[CleanupListener] Cleaning up project: ${projectId}`);
    const { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } = require("@kubernetes/client-node");
    const kubeconfig = new KubeConfig();
    kubeconfig.loadFromDefault();
    const coreV1Api = kubeconfig.makeApiClient(CoreV1Api);
    const appsV1Api = kubeconfig.makeApiClient(AppsV1Api);
    const networkingV1Api = kubeconfig.makeApiClient(NetworkingV1Api);

    
    // Update last updated timestamp in database before cleanup
    try {
      await Project.findOneAndUpdate(
        { projectId: projectId },
        { lastUpdatedAt: new Date() },
        { new: true }
      );
      console.log(`[CleanupListener] Updated lastUpdatedAt for project ${projectId}`);
    } catch (error) {
      console.error(`[CleanupListener] Failed to update lastUpdatedAt for project ${projectId}:`, error);
    }
    
    const namespace = 'default';
    
    // Delete Kubernetes resources
    try {
      await appsV1Api.deleteNamespacedDeployment(projectId, namespace);
      console.log(`[CleanupListener] Deleted Deployment ${projectId}`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`[CleanupListener] Deployment ${projectId} not found (already deleted)`);
      } else {
        console.error(`[CleanupListener] Error deleting Deployment ${projectId}:`, error.message);
      }
    }

    try {
      await coreV1Api.deleteNamespacedService(projectId, namespace);
      console.log(`[CleanupListener] Deleted Service ${projectId}`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`[CleanupListener] Service ${projectId} not found (already deleted)`);
      } else {
        console.error(`[CleanupListener] Error deleting Service ${projectId}:`, error.message);
      }
    }

    try {
      await networkingV1Api.deleteNamespacedIngress(projectId, namespace);
      console.log(`[CleanupListener] Deleted Ingress ${projectId}`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`[CleanupListener] Ingress ${projectId} not found (already deleted)`);
      } else {
        console.error(`[CleanupListener] Error deleting Ingress ${projectId}:`, error.message);
      }
    }

    // Mark project as inactive in database (optional)
    // You can add database update logic here if needed
    
    console.log(`[CleanupListener] Successfully cleaned up project: ${projectId}`);
    
  } catch (error) {
    console.error(`[CleanupListener] Error during cleanup of project ${projectId}:`, error);
  }
}

export default startCleanupListener; 