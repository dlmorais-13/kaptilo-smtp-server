const { createClient } = require('redis');

/**
 * Class for the RedisStorage.
 *
 * By default, connects to a Redis instance running on localhost:6379.
 * It is possible to change the connection URL using the environment variable REDIS_URL.
 */
module.exports = class RedisStorage {
  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redisClient = createClient({ url: redisUrl });
    this.redisClient.on('error', console.log);
    this.maxItems = process.env.MAX_ITEMS || 0;
    this.ttl = Number(process.env.TTL || 0);
  }

  /**
   * Connects the RedisClient.
   */
  async connect() {
    await this.redisClient.connect();
  }

  /**
   * Pushes an email into the Redis storage.
   * 
   * It will be stored as a hash set containing the basic email metadata
   * and also stores the raw content.
   * Also, the key will be stored in a ordered list, to be used in the logic
   * that will remove the oldest emails if there are more emails than the
   * configured maximum.
   * 
   * If defined a time-to-live (TTL), then a expiration will be set on the
   * newly created key.
   * 
   * If defined a maximum number of items (MAX_ITEMS), then upon insertion of a new item,
   * a lookup of the oldest items will be performed and the oldest items are
   * going to be removed, if necessary.
   * 
   * @param {string} user User that sent the email to SMTP server.
   * @param {object} email Parsed email data.
   * @param {string} raw Raw email data.
   */
  async push(user, email, raw) {
    const key = `box:${user}:${email.messageId}`;
    await Promise.all([
      this.redisClient.hSet(key, 'messageId', email.messageId),
      this.redisClient.hSet(key, 'subject', email.subject),
      this.redisClient.hSet(key, 'date', email.date.toISOString()),
      this.redisClient.hSet(key, 'recipient', email.to.text),
      this.redisClient.hSet(key, 'user', user),
      this.redisClient.hSet(key, 'raw', raw),
      this.redisClient.lPush('emailKeys', [key]),
    ]);

    if (this.ttl) {
      await this.redisClient.expire(key, this.ttl * 60);
    }

    if (this.maxItems > 0) {
      let numKeys = (await this.redisClient.dbSize()) - 1;
      // If the number of keys in the database is bigger than the maximum allowed
      if (numKeys > this.maxItems) {
        // Get the oldest N keys from the ordered list,
        // where N is the amount that surpasses the maximum configured.
        const popedKeys = await this.redisClient.rPopCount(
          'emailKeys',
          numKeys - this.maxItems
        );

        // Deletes all found keys, concurrently.
        await Promise.all(popedKeys.map((k) => this.redisClient.del(k)));
      }
    }
  }

  /**
   * Retrieves all emails sent by a given user.
   * The raw emails are not returned, only their metadata.
   * 
   * @param {string} user Name of the user.
   * @returns {array} Array with the emails found.
   */
  async getEmails(user) {
    const emails = [];
    for await (const key of this.redisClient.scanIterator({
      MATCH: `box:${user}:*`,
    })) {
      const [messageId, subject, date, recipient, user] =
        await this.redisClient.hmGet(key, [
          'messageId',
          'subject',
          'date',
          'recipient',
          'user',
        ]);
      emails.push({ messageId, subject, date, recipient, user });
    }
    return emails;
  }

  /**
   * Retrieves the raw data of an email sent by a given user.
   * 
   * @param {string} user Name of the user.
   * @param {string} messageId ID of the email.
   * @returns {string} The email raw data.
   */
  async getEmail(user, messageId) {
    return this.redisClient.hGet(`box:${user}:${messageId}`, 'raw');
  }

  /**
   * Retrieves a list of all users that currently have an email
   * stored in Redis.
   *  
   * @returns {array} List of all the users.
   */
  async listUsers() {
    const keys = [];

    for await (const key of this.redisClient.scanIterator({ MATCH: 'box:*' })) {
      keys.push(key.replace(new RegExp(`^box:(.*):.*`), '$1'));
    }

    return Array.from(new Set(keys));
  }
};
