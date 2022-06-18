/**
 * Tests for LocalStorage.
 */

const LocalStorage = require('./local-storage');
const storageTests = require('./storage.test');
storageTests(async () => new LocalStorage(), 'LocalStorage');
