const { DateTime } = require("luxon");

/**
 * Class for the memory storage.
 */
module.exports = class LocalStorage {
  constructor() {
    this.keys = [];
    this.emails = {};
    this.maxItems = process.env.MAX_ITEMS || 0;
    this.ttl = process.env.TTL || 0;
  }

  /**
   * Pushes an email into the memory storage.
   * 
   * It will be stored as a object containing the basic email metadata
   * and also stores the raw content.
   * Also, the key will be stored in a ordered list, to be used in the logic
   * that will remove the oldest emails if there are more emails than the
   * configured maximum.
   * 
   * If defined a maximum number of items (MAX_ITEMS), then upon insertion of a new item,
   * a lookup of the oldest items will be performed and the oldest items are
   * going to be removed, if necessary.
   * 
   * Upon each insertion, the time-to-live of all the other emails will be checked
   * and the deletion will be triggered, if necessary.
   * 
   * @param {string} user User that sent the email to SMTP server.
   * @param {object} email Parsed email data.
   * @param {string} raw Raw email data.
   */
  async push(user, email, raw) {
    const emailKey = `${user}:${email.messageId}`;
    this.emails[emailKey] = {
      messageId: email.messageId,
      subject: email.subject,
      date: email.date,
      recipient: email.to.text,
      user,
      raw,
    };

    this.keys.push(emailKey);

    // If the number of keys in the database is bigger than the maximum allowed
    if (this.maxItems > 0 && this.keys.length > this.maxItems) {
      // Get the oldest N keys from the ordered list,
      // where N is the amount that surpasses the maximum configured.
      this.keys = this.keys.slice(-this.maxItems);

      // Deletes all found keys.
      for (const k of Object.keys(this.emails)) {
        if (!this.keys.includes(k)) delete this.emails[k];
      }
    }

    // Check for old email to delete.
    this.checkTtl();
  }

  /**
   * Checks all the emails if their time-to-live expired and
   * deletes if necessary.
   */
  checkTtl() {
    if (this.ttl) {
      const threshold = DateTime.now().minus({ minutes: this.ttl });
      for (const mailKey in this.emails) {
        const email = this.emails[mailKey];
        const emailDate = DateTime.fromJSDate(email.date);
        if (emailDate < threshold) {
          delete this.emails[mailKey];
          this.keys = [ ...this.keys.filter(k => k !== mailKey) ];
        }
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
    const prefix = `${user}:`;
    return this.keys
      .filter((k) => k.startsWith(prefix))
      .map((k) => {
        const { raw, ...email } = this.emails[k];
        return email;
      });
  }

  /**
   * Retrieves the raw data of an email sent by a given user.
   * 
   * @param {string} user Name of the user.
   * @param {string} messageId ID of the email.
   * @returns {string} The email raw data.
   */
  async getEmail(user, messageId) {
    return this.emails[`${user}:${messageId}`]?.raw;
  }

  /**
   * Retrieves a list of all users that currently have an email stored.
   *  
   * @returns {array} List of all the users.
   */
  async listUsers() {
    const keys = this.keys
      .map(k => k.replace(new RegExp('^(.*):.*'), '$1'));
    return Array.from(new Set(keys));
  }
};
