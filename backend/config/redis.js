import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

if (redis) {
    redis.on('connect', () => {
        console.log('Redis connected successfully!');
    });
    
    redis.on('error', (err) => {
        console.error('Redis connection error:', err.message);
    });
} else {
    console.warn("WARNING: REDIS_URL not found in .env. Real-time notifications will not work!");
}

export default redis;
