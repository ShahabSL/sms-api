const jwt = require('jsonwebtoken');
const { sha256 } = require('../utils/crypto');
const { JWT_SECRET, DEMO_USER, DEMO_PASSWORD } = require('../config/env');

/**
 * Login service
 */
function login(username, password) {
  // Hash the password
  const hashedPassword = sha256(password);
  
  // Check if credentials match
  if (username === DEMO_USER && hashedPassword === DEMO_PASSWORD) {
    const token = jwt.sign({ username }, JWT_SECRET);
    return { 
      success: true, 
      token 
    };
  }
  
  return { 
    success: false, 
    error: 'unauthorized' 
  };
}

module.exports = {
  login
};