import redis from '../utils/redisClient';

const PROJECT_TTL = 60 * 10; // 10 minutes

export async function userJoinedProject(projectId: string, userId: string) {
  const projectKey = `active_project:${projectId}`;
  const usersKey = `active_project_users:${projectId}`;

  try {
    // Add project and user, set/refresh TTL
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
    // Refresh TTL on any activity
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
    
    // Check if set is empty and expire immediately
    const userCount = await redis.scard(usersKey);
    if (userCount === 0) {
      await redis.expire(usersKey, 1); // expire soon
      await redis.expire(`active_project:${projectId}`, 1);
      console.log(`[ActivityTracker] No users left in project ${projectId}, marking for cleanup`);
    } else {
      console.log(`[ActivityTracker] User ${userId} left project ${projectId}, ${userCount} users remaining`);
    }
  } catch (error) {
    console.error(`[ActivityTracker] Error removing user from project:`, error);
  }
}

export async function isProjectActive(projectId: string): Promise<boolean> {
  try {
    return (await redis.exists(`active_project:${projectId}`)) === 1;
  } catch (error) {
    console.error(`[ActivityTracker] Error checking project status:`, error);
    return false;
  }
}

export async function getActiveUsers(projectId: string): Promise<string[]> {
  try {
    return await redis.smembers(`active_project_users:${projectId}`);
  } catch (error) {
    console.error(`[ActivityTracker] Error getting active users:`, error);
    return [];
  }
}

export async function getActiveProjects(): Promise<string[]> {
  try {
    const keys = await redis.keys('active_project:*');
    return keys.map(key => key.replace('active_project:', ''));
  } catch (error) {
    console.error(`[ActivityTracker] Error getting active projects:`, error);
    return [];
  }
} 