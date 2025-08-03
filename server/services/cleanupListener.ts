import Redis from 'ioredis';
import { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } from '@kubernetes/client-node';

// Initialize Kubernetes client
const kubeconfig = new KubeConfig();
kubeconfig.loadFromDefault();
const appsV1Api = kubeconfig.makeApiClient(AppsV1Api);
const coreV1Api = kubeconfig.makeApiClient(CoreV1Api);
const networkingV1Api = kubeconfig.makeApiClient(NetworkingV1Api);

function startCleanupListener() {
  console.log('[CleanupListener] Starting Redis keyspace notification listener...');
  
  const sub = new Redis({ 
    host: process.env.REDIS_HOST || 'localhost', 
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
      console.log(`[CleanupListener] Project ${projectId} expired, starting cleanup...`);
      await cleanupProject(projectId);
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
    
    // Send last update info to database before cleanup
    try {
      const runnerUrl = `http://${projectId}.127.0.0.1.sslip.io`;
      await fetch(`${runnerUrl}/sendLastUpdateInfo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId })
      });
      console.log(`[CleanupListener] Sent last update info for project ${projectId}`);
    } catch (error) {
      console.error(`[CleanupListener] Failed to send last update info for project ${projectId}:`, error);
    }
    
    const namespace = 'default';
    
    // Delete Kubernetes resources
    try {
      await appsV1Api.deleteNamespacedDeployment({ name: projectId, namespace });
      console.log(`[CleanupListener] Deleted Deployment ${projectId}`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`[CleanupListener] Deployment ${projectId} not found (already deleted)`);
      } else {
        console.error(`[CleanupListener] Error deleting Deployment ${projectId}:`, error.message);
      }
    }

    try {
      await coreV1Api.deleteNamespacedService({ name: projectId, namespace });
      console.log(`[CleanupListener] Deleted Service ${projectId}`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`[CleanupListener] Service ${projectId} not found (already deleted)`);
      } else {
        console.error(`[CleanupListener] Error deleting Service ${projectId}:`, error.message);
      }
    }

    try {
      await networkingV1Api.deleteNamespacedIngress({ name: projectId, namespace });
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