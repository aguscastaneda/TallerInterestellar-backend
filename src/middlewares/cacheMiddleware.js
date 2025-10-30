const crypto = require('crypto');
const { getRedis } = require('../lib/redis');

const DEFAULT_TTL_SECONDS = process.env.REDIS_TTL_SECONDS
    ? Number(process.env.REDIS_TTL_SECONDS)
    : 60;

function buildCacheKey(req, namespace = 'repairs') {
    const identity = {
        path: req.baseUrl + req.path,
        query: req.query || {},
        user: req.user
            ? { role: req.user.role?.name, userId: req.user.id, mechId: req.user.mechanic?.id, clientId: req.user.client?.id }
            : null,
    };
    const raw = JSON.stringify(identity, Object.keys(identity).sort());
    const digest = crypto.createHash('sha256').update(raw).digest('hex');
    return `cache:${namespace}:${digest}`;
}

function cacheGet(namespace, ttlSeconds = DEFAULT_TTL_SECONDS) {
    return async (req, res, next) => {
        try {
            const client = await getRedis();
            const key = buildCacheKey(req, namespace);
            const cached = await client.get(key);
            if (cached) {
                const payload = JSON.parse(cached);
                return res.json(payload);
            }

            const originalJson = res.json.bind(res);
            res.json = async (body) => {
                try {
                    await client.set(key, JSON.stringify(body), { EX: ttlSeconds });
                } catch (e) {
                    console.warn('[cache] set failed', e.message);
                }
                return originalJson(body);
            };

            return next();
        } catch (err) {
            console.warn('[cache] middleware error', err.message);
            return next();
        }
    };
}

async function invalidateNamespace(namespace = 'repairs') {
    const client = await getRedis();
    const iter = client.scanIterator({ MATCH: `cache:${namespace}:*`, COUNT: 100 });
    const keys = [];
    for await (const key of iter) keys.push(key);
    if (keys.length) await client.del(keys);
}

module.exports = { cacheGet, invalidateNamespace };


