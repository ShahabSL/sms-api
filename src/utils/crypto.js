const crypto = require('crypto');

/**
 * Calculate SHA-256 hash of a password
 */
function sha256(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = {
  sha256
};