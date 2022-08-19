const ldap = require('ldapjs');
const { promisify } = require('util');

/**
 * LdapClient used for authentications of SMTP server.
 * Uses the package 'ldapjs' under the hood.
 */
module.exports = class LdapClient {
  client = null;

  /**
   * Constructor that creates the client and setups the error listeners.
   * It will not connect to the LDAP server. That must be done using the method 'connect'.
   */
  constructor() {
    this.client = ldap.createClient({
      url: [`ldap://${process.env.LDAP_HOST}:${process.env.LDAP_PORT}`],
    });

    this.client.on('connectRefused', this.handleConnectionError.bind(this));
    this.client.on('connectError', this.handleConnectionError.bind(this));
    this.client.on('connectTimeout', this.handleConnectionError.bind(this));
    this.client.on('setupError', this.handleConnectionError.bind(this));
    this.client.on('socketTimeout', this.handleConnectionError.bind(this));
    this.client.on('error', this.handleConnectionError.bind(this));
  }

  /**
   * Handles a LDAP error by simply logging it.
   * 
   * @param {error} err Error thrown.
   */
  handleConnectionError = (err) => {
    console.error(`Error connecting with LDAP server: ${err.message}`);
    console.error(err);
  };

  /**
   * Binds into the LDAP server using the provided credentials, or using
   * the environment variables LDAP_BIND_DN and LDAP_BIND_PASSWORD.
   * 
   * @param {string} userdn User DN for bind.
   * @param {string} password Password for bind.
   */
  async connect(userdn, password) {
    await promisify(this.client.bind.bind(this.client))(userdn || process.env.LDAP_BIND_DN, password || process.env.LDAP_BIND_PASSWORD);
  }

  /**
   * Unbinds the underlying client.
   */
  async disconnect() {
    await promisify(this.client.unbind.bind(this.client))();
  }

  /**
   * Perform an authentication on LDAP server using the provided credentials.
   * 
   * The authentication process follows the steps below:
   * 1. Using the main connection, a search for a user with `uid={username}` is made.
   * 2. If a user is found, a new connection is created and bound using the found user DN and the provided password.
   * 3. If the new connection binds succesfully, then authentication also succeeds.
   * 
   * @param {string} username Username to check for authentication.
   * @param {string} password Password to check for authentication.
   * @returns {object} Object with the username (attribute user) if authentication succeeds.
   */
  async auth(username, password) {
    try {
      const uidAttr = process.env.LDAP_USER_ID_ATTR || 'uid';
      const search = await promisify(this.client.search.bind(this.client))(
        process.env.LDAP_SEARCH_BASE,
        {
          scope: process.env.LDAP_SEARCH_SCOPE || 'sub',
          attributes: ['dn', uidAttr],
          filter: `${uidAttr}=${username}`,
        }
      );
  
      const entry = await this.getSearchEntry(search);
      
      const authLdapClient = new LdapClient();
      await authLdapClient.connect(entry.object.dn, password);
      await authLdapClient.disconnect();

      const { controls, ...user } = entry.object;
      return user;
    } catch (err) {
      console.error(err);
      throw new Error('Authentication failed'); 
    }
  }

  /**
   * Returns a promise that resolves with a found entry of a given search, or
   * rejects with the reason the search failed.
   * 
   * @param {object} search LDAP search object.
   * @returns A promise that resolves with a found LDAP entry.
   */
  async getSearchEntry(search) {
    return new Promise((resolve, reject) => {
      search.on('error', reject);
      search.on('searchEntry', resolve);
    });
  }

}
