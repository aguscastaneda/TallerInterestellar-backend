const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL;
const redisUsername = process.env.REDIS_USERNAME || 'default';
const redisPassword = process.env.REDIS_PASSWORD;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined;
const redisTls = process.env.REDIS_TLS === 'true';

let client;

function buildClient() {
    if (redisUrl) {
        return createClient({ url: redisUrl, socket: { tls: redisTls } });
    }
    return createClient({
        username: redisUsername,
        password: redisPassword,
        socket: {
            host: redisHost,
            port: redisPort,
            tls: redisTls,
        },
    });
}

async function getRedis() {
    if (!client) {
        client = buildClient();
        client.on('error', (err) => console.error('Redis Client Error', err));
        await client.connect();
        console.log('[redis] connected');
    }
    return client;
}

async function disconnectRedis() {
    if (client) {
        try {
            await client.quit();
            console.log('[redis] disconnected');
        } catch (e) {
            console.error('[redis] error on disconnect', e);
        } finally {
            client = null;
        }
    }
}

module.exports = { getRedis, disconnectRedis };


