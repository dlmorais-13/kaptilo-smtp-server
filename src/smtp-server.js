const SMTPServer = require('smtp-server').SMTPServer;
const simpleParser = require('mailparser').simpleParser;
const LdapClient = require('./ldap-client');
const camelCase = require('lodash.camelcase');

/**
 * SMTP Server class.
 *
 * Uses package 'smtp-server' (https://nodemailer.com/extras/smtp-server) under the hood
 * to serve a simple SMTP server that will receive emails and store them in a storage (local or Redis).
 *
 * All the options existent on package 'smtp-server' can be configured using environment variables
 * prefixed by 'SMTP_'.
 * Ex.: options.size = SMTP_size
 * Available options here: https://nodemailer.com/extras/smtp-server/#step-3-create-smtpserver-instance
 *
 * The authentication can be configured with 3 different methods, 'none' (default), 'basic', and 'ldap',
 * using the environment variable SMTP_AUTH_MODE.
 *
 * Aditional configuration:
 * - SMTP_IP: Host to be used when listening (default: 0.0.0.0)
 * - SMTP_PORT: Port to be listened (default: 5025)
 */
module.exports = class SMTP {
  ldapClient = null;

  constructor() {
    // Build options for smtp-server.
    const options = Object.keys(process.env)
      .filter((k) => k.startsWith('SMTP_OPT_'))
      .reduce((acc, k) => {
        let value = process.env[k];
        if (value === 'true') value = true;
        if (value === 'false') value = false;
        const smtpOptionName = camelCase(k.replace(/^SMTP_OPT_/, ''));
        console.log(`Using SMTP option "${smtpOptionName}" with value "${value}"`);
        acc[smtpOptionName] = value;
        return acc;
      }, {});

    // Instantiates the server, defining the authentication mode and callbacks for
    // authentication and mail receiving.
    const clazz = this;
    this.server = new SMTPServer({
      authOptional: (process.env.SMTP_AUTH_MODE || 'none') === 'none',
      ...options,
      onAuth(auth, session, cb) {
        clazz.onAuth(auth, session, cb);
      },
      onData(stream, session, cb) {
        clazz.onData(stream, session, cb);
      },
    });
    this.server.on('error', console.error);

    // Instantiates the storage.
    if (process.env.REDIS === 'true') {
      const RedisStorage = require('./redis-storage');
      this.storage = new RedisStorage();
    } else {
      const LocalStorage = require('./local-storage');
      this.storage = new LocalStorage();
    }
  }

  /**
   * Starts the SMTP server.
   */
  async startServer() {
    if (this.storage.connect) await this.storage.connect();

    const port = process.env.SMTP_PORT || 5025;
    const host = process.env.SMTP_IP || '0.0.0.0';
    this.server.listen(port, host, () => {
      console.log(`SMTP Server listening on ${host}:${port}`);
    });
  }

  /**
   * Perform the authentication of SMTP server.
   * 
   * If succeeds, executes callback function passing the username as second argument.
   * If fails, executes callback function passsing the error as the first argument.
   * 
   * If there is no authentication configured, will ignore any parameter and succeed with a
   * pseudo-user called 'anonymous'.
   * 
   * If it is configured with basic authentication (SMTP_AUTH_MODE=basic), then it will lookup
   * for a user with the given credentials listed on the environment variable SMTP_AUTH_USERS, which
   * should be composed by a list, separated by commas (,) of user/password duos, separated by colons (:).
   * 
   * If it is configured with ldap authentication (SMTP_AUTH_MODE=ldap), then the login will
   * delegate login logic to the ldap client and execute the callback function in case of success.
   * 
   * @param {object} auth Authentication object. (see https://nodemailer.com/extras/smtp-server/#handling-authentication)
   * @param {object} session Session data. (see https://nodemailer.com/extras/smtp-server/#session-object)
   * @param {function} cb Callback function to be executed after authentication (see https://nodemailer.com/extras/smtp-server/#handling-authentication)
   */
  onAuth(auth, session, cb) {
    const authMode = process.env.SMTP_AUTH_MODE || 'none';
    if (authMode === 'none') {
      cb(null, { user: 'anonymous' });
      return;
    }

    console.log(
      `Received auth from: ${auth.username}@${session.remoteAddress} (#${session.id})`
    );

    if (authMode === 'basic') {
      let users = (process.env.SMTP_AUTH_USERS || '')
        .split(',')
        .map((up) => up.trim());

      const user = users.find(
        (up) => up === `${auth.username}:${auth.password}`
      );
      if (!user) {
        cb(new Error('Invalid credentials'));
      } else {
        cb(null, { user: auth.username });
      }
    } else if (authMode === 'ldap') {
      (async () => {
        try {
          if (!this.ldapClient) {
            this.ldapClient = new LdapClient();
            await this.ldapClient.connect();
          }
        } catch (err) {
          cb(new Error('Invalid authentication configuration'));
        }

        try {
          await this.ldapClient.auth(auth.username, auth.password);
          cb(null, { user: auth.username });
        } catch (err) {
          cb(err);
        }
      })();
    } else {
      cb(new Error('Invalid authentication configuration'));
    }
  }

  /**
   * Function to receive the email and store in the underlying storage.
   * 
   * It will store both the raw email and some metadata to allow better display
   * in the frontend without the need to read the whole message.
   * 
   * @param {stream} stream Stream with the email content.
   * @param {object} session Session object containing authentication data.
   * @param {function} cb Function to be called in the end of processing.
   */
  onData(stream, session, cb) {
    console.log(
      `Received data from: ${session.user}@${session.remoteAddress} (#${session.id})`
    );

    const chunks = [];
    stream.on('data', (c) => chunks.push(Buffer.from(c)));
    stream.on('error', cb);
    stream.on('end', () => {
      const rawEmail = Buffer.concat(chunks).toString('utf-8');
      simpleParser(rawEmail).then(async (email) => {
        email.messageId = email.messageId.replace(/[<>]/g, '');
        await this.storage.push(session.user, email, rawEmail);
        cb();
      });
    });
  }

  /**
   * Retrieves the list of all users that have sent emails to this server.
   * Will only list users that currently have any unexpired email.
   * 
   * @returns {array} List of the users that have emails sent to this server.
   */
  async listUsers() {
    return this.storage.listUsers();
  }

  /**
   * Retrieves the list of all emails that were sent by a given user.
   * 
   * Only the basic metadata of the emails are returned. The raw email
   * can be requested for each email using the method getEmail.
   * 
   * @param {string} user User to search for its emails.
   * @returns {array} List of all the emails found.
   */
  async listUserEmails(user) {
    return this.storage.getEmails(user);
  }

  /**
   * Lookup for an email and returns its raw content parsed using 'mailparser'.
   * 
   * @param {string} user User that sent the email.
   * @param {string} messageId The message id to lookup.
   * @returns {object} The parsed raw content of the email.
   */
  async getEmail(user, messageId) {
    const rawEmail = await this.storage.getEmail(user, messageId);
    if (rawEmail) {
      const parsedEmail = await simpleParser(rawEmail);
      parsedEmail.raw = rawEmail;
      return parsedEmail;
    } else {
      return null;
    }
  }
};
