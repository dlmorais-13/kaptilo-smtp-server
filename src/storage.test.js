const { randomEmail } = require('./utils.test');

/**
 * Generic tests for the storage providers.
 * Each test will be run in a newly instantiated storage, created by the provider function.
 * 
 * @param {function} storageProvider Function that instantiates a storage provider.
 * @param {string} storageType Type of the storage created by the provider.
 * @param {function} teardownFn Function to be executed after each test.
 */
const storageTests = (storageProvider, storageType, teardownFn) => {
  describe(storageType, () => {
    let storage;

    /** Before each test, cleanup the environment variables. */
    beforeEach(async () => {
      delete process.env.MAX_ITEMS;
      delete process.env.TTL;
    });

    /** After each test, execute the teardown, if defined. */
    afterEach(async () => teardownFn && (await teardownFn(storage)));

    test('storage starts empty', async () => {
      storage = await storageProvider();
      const list = await storage.listUsers();
      expect(list).toEqual([]);
    });

    test('storage respects MAX_ITEMS', async () => {
      process.env.MAX_ITEMS = 2;
      storage = await storageProvider();

      await storage.push('anonymous', randomEmail(), 'raw');
      await storage.push('anonymous', randomEmail(), 'raw');
      await storage.push('anonymous', randomEmail(), 'raw');

      const list = await storage.getEmails('anonymous');
      expect(list).toHaveLength(2);
    });

    test('storage lists added emails for user', async () => {
      storage = await storageProvider();

      await Promise.all([
        storage.push('anonymous', randomEmail(), 'raw'),
        storage.push('anonymous', randomEmail(), 'raw'),
        storage.push('anonymous', randomEmail(), 'raw'),
      ]);
      const list = await storage.getEmails('anonymous');
      expect(list).toHaveLength(3);
    });

    test('storage lists emails filtering by user', async () => {
      storage = await storageProvider();

      await Promise.all([
        storage.push('anonymous', randomEmail(), 'raw'),
        storage.push('anonymous', randomEmail(), 'raw'),
        storage.push('user01', randomEmail(), 'raw'),
      ]);

      const anomList = await storage.getEmails('anonymous');
      expect(anomList).toHaveLength(2);

      const userList = await storage.getEmails('user01');
      expect(userList).toHaveLength(1);
    });

    test('storage lists all users', async () => {
      storage = await storageProvider();

      await Promise.all([
        storage.push('anonymous', randomEmail(), 'raw'),
        storage.push('anonymous', randomEmail(), 'raw'),
        storage.push('user01', randomEmail(), 'raw'),
      ]);

      const usersList = await storage.listUsers();
      expect(usersList).toHaveLength(2);
      expect(usersList).toContain('anonymous');
      expect(usersList).toContain('user01');
    });

    test('storage recovers an email', async () => {
      storage = await storageProvider();
      const email = randomEmail();

      await Promise.all([
        storage.push('anonymous', randomEmail(), 'raw'),
        storage.push('anonymous', email, 'raw'),
        storage.push('anonymous', randomEmail(), 'raw'),
      ]);

      const raw = await storage.getEmail(
        'anonymous',
        email.messageId
      );
      expect(raw).toBe('raw');
    });
  });
};

module.exports = storageTests;
