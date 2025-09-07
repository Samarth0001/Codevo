import redis from '../utils/redisClient';

const PROJECT_TTL = 60 * 10; // 10 minutes

// Projects are kept active for the full TTL even when users leave temporarily
// This prevents premature deletion during GitHub OAuth or other temporary absences
// Projects will only be cleaned up after 10 minutes of inactivity
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
    
    // Verify TTL was set correctly
    const projectTTL = await redis.ttl(projectKey);
    const usersTTL = await redis.ttl(usersKey);
    
    console.log(`[ActivityTracker] User ${userId} joined project ${projectId}, project TTL: ${projectTTL}s, users TTL: ${usersTTL}s`);
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
  const projectKey = `active_project:${projectId}`;
  
  try {
    await redis.srem(usersKey, userId);
    
    // Check if set is empty
    const userCount = await redis.scard(usersKey);
    const projectTTL = await redis.ttl(projectKey);
    
    console.log(`[ActivityTracker] User ${userId} left project ${projectId}, users remaining: ${userCount}, project TTL: ${projectTTL}s`);
    
    if (userCount === 0) {
      // await redis.expire(usersKey, 1); // expire soon
      // await redis.expire(`active_project:${projectId}`, 1);
      // Don't immediately expire the project - let it expire naturally after TTL
      // This prevents deletion during temporary absences (like GitHub OAuth)
      console.log(`[ActivityTracker] No users left in project ${projectId}, but keeping project active for TTL (${projectTTL}s remaining)`);
      
      // Double-check that we're not accidentally expiring the project
      if (projectTTL <= 0) {
        console.warn(`[ActivityTracker] WARNING: Project ${projectId} TTL is ${projectTTL}, this might cause immediate cleanup!`);
      }
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

// Manually expire a project (for admin purposes)
export async function forceExpireProject(projectId: string) {
  try {
    const projectKey = `active_project:${projectId}`;
    const usersKey = `active_project_users:${projectId}`;
    
    await redis.multi()
      .expire(projectKey, 1)
      .expire(usersKey, 1)
      .exec();
    
    console.log(`[ActivityTracker] Manually expired project ${projectId}`);
  } catch (error) {
    console.error(`[ActivityTracker] Error force expiring project:`, error);
  }
} 