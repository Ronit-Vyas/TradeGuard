import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function testRedis() {
    try {
        const response = await redis.ping();
        console.log("Redis connected successfully!");
        console.log("Response:", response);
    } catch (error) {
        console.error("Redis connection failed:", error.message);
    }
}

testRedis();