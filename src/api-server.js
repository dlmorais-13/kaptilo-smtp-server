const express = require('express');

/**
 * Class to create a simple API server.
 */
module.exports = class API {
  smtp = null;

  constructor(smtp) {
    this.smtp = smtp;

    // Init HTTP Server.
    this.app = express();

    // Defines the static route for the frontend.
    this.app.use(express.static('src/public'));

    // Defines the API routes.
    this.app.get('/api/users', this.listUsers.bind(this));
    this.app.get('/api/users/:user/emails', this.listEmails.bind(this));
    this.app.get('/api/users/:user/emails/:messageId', this.getEmail.bind(this));
  }

  /**
   * Lists all users that have sent an email and is still on the storage.
   * 
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {function} next Function to be called to execute the next middleware in chain.
   */
  async listUsers(req, res, next) {
    try {
      res.send(await this.smtp.listUsers());
    } catch (e) {
      next(e);
    }
  }

  /**
   * Lists emails sent by a given user.
   * 
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {function} next Function to be called to execute the next middleware in chain.
   */
  async listEmails(req, res, next) {
    try {
      res.send(await this.smtp.listUserEmails(req.params.user));
    } catch (e) {
      next(e);
    }
  }

  /**
   * Retrives an email sent by a given user using its unique ID.
   * 
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {function} next Function to be called to execute the next middleware in chain.
   */
  async getEmail(req, res, next) {
    try {
      res.send(await this.smtp.getEmail(req.params.user, req.params.messageId));
    } catch (e) {
      next(e);
    }
  }

  /**
   * Starts the API server, listening on 0.0.0.0:8080, by default.
   * The address can be changed using the environment variables HTTP_IP and HTTP_PORT.
   */
  startServer() {
    const address = process.env.HTTP_IP || '0.0.0.0';
    const port = process.env.HTTP_PORT || 8080;
    this.app.listen(port, address, () => {
      console.log(`API server listening on ${address}:${port}`);
    });
  }
};
