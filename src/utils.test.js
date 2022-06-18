/** 
 * Utility class for tests.
 */

const crypto = require('crypto');

/**
 * Creates a random email object as it would be created by package 'mailparser'.
 * Only the attributes used by the application are defined.
 * 
 * @returns {object} Randomly created email object.
 */
function randomEmail() {
  return {
    messageId: crypto.randomBytes(8).toString('hex'),
    subject: crypto.randomBytes(8).toString('hex'),
    to: { text: randomRecipient() },
    date: new Date(),
  };
}

/**
 * Creates a random email address to be used as recipient to an email.
 * 
 * @returns {string} Randomly created recipient;
 */
function randomRecipient() {
  return `${crypto.randomBytes(4).toString('hex')}@example.com`;
}

module.exports = {
  randomEmail,
  randomRecipient,
};

test('randomEmail returns a email object', () => {
  const email = randomEmail();
  expect(email).toHaveProperty('messageId');
  expect(email).toHaveProperty('subject');
  expect(email).toHaveProperty('date');
  expect(email).toHaveProperty('to');
  expect(email.to).toHaveProperty('text');
});

test('randomRecipient return a email string', () => {
  const recipient = randomRecipient();
  expect(recipient).toMatch(/^[^@]{8}@example.com$/);
});
