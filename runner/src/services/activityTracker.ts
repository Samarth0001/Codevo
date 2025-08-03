import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  maxRetriesPerRequest: 5,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  keepAlive: 30000,
  reconnectOnError: (err) => {
    console.log('[ActivityTracker] Redis reconnect on error:', err.message);
    return true;
  },
});

const PROJECT_TTL = 60 * 10; // 10 minutes

export async function userJoinedProject(projectId: string, userId: string) {
  const projectKey = `active_project:${projectId}`;
  const usersKey = `active_project_users:${projectId}`;

  try {
    await redis.multi()
      .sadd(usersKey, userId)
      .set(projectKey, 'active', 'EX', PROJECT_TTL)
      .expire(usersKey, PROJECT_TTL)
      .exec();
    
    console.log(`[ActivityTracker] User ${userId} joined project ${projectId}`);
  } catch (error) {
    console.error(`[ActivityTracker] Error adding user to project:`, error);
  }
}

export async function userActivity(projectId: string) {
  try {
    const projectKey = `active_project:${projectId}`;
    const usersKey = `active_project_users:${projectId}`;
    
    await redis.multi()
      .expire(projectKey, PROJECT_TTL)
      .expire(usersKey, PROJECT_TTL)
      .exec();
    
    console.log(`[ActivityTracker] Activity detected for project ${projectId}`);
  } catch (error) {
    console.error(`[ActivityTracker] Error updating activity:`, error);
  }
}

export async function userLeftProject(projectId: string, userId: string) {
  const usersKey = `active_project_users:${projectId}`;
  
  try {
    await redis.srem(usersKey, userId);
    
    const userCount = await redis.scard(usersKey);
    if (userCount === 0) {
      await redis.expire(usersKey, 1);
      await redis.expire(`active_project:${projectId}`, 1);
      console.log(`[ActivityTracker] No users left in project ${projectId}, marking for cleanup`);
    } else {
      console.log(`[ActivityTracker] User ${userId} left project ${projectId}, ${userCount} users remaining`);
    }
  } catch (error) {
    console.error(`[ActivityTracker] Error removing user from project:`, error);
  }
} 