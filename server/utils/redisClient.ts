// server/utils/redisClient.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost', // Use localhost for port-forward
  port: Number(process.env.REDIS_PORT) || 6379,
  // password: process.env.REDIS_PASSWORD, // if set
  maxRetriesPerRequest: 5,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  keepAlive: 30000,
  reconnectOnError: (err) => {
    console.log('[RedisClient] Redis reconnect on error:', err.message);
    return true;
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

export default redis;