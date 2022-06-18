/**
 * Tests for RedisStorage.
 * Those tests depend on a running instance of Redis listening on localhost:6379 without credentials.
 */

const RedisStorage = require('./redis-storage');
const storageTests = require('./storage.test');

storageTests(async () => {
    const storage = new RedisStorage();
    await storage.connect();
    await storage.redisClient.flushAll();
    return storage;
}, 'RedisStorage', async (storage) => {
    await storage.redisClient.flushAll();
    await storage.redisClient.quit();
});
