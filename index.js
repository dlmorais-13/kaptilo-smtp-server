require('dotenv').config();

// Init SMTP Server.
const SMTP = require('./src/smtp-server');
const smtp = new SMTP();
smtp.startServer();

// Init API Server.
const API = require('./src/api-server');
const api = new API(smtp);
api.startServer();

// Handle codes that are sent by containers orchestrators.
function handleCode(code) {
  console.log(`Received ${code}. Stopping server ...`);
  process.exit(0);
}

process.on('SIGTERM', handleCode);
process.on('SIGINT', handleCode);
