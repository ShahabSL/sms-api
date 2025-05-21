const authService = require('../services/authService');

/**
 * Handle token generation
 */
function generateToken(req, res) {
  console.log('hit tokengen');
  
  const { username, password } = req.body;
  
  const result = authService.login(username, password);
  
  if (result.success) {
    res.json({ token: result.token });
  } else {
    res.status(401).json({ success: false, error: 'unauthorized' });
  }
}

/**
 * Protected resource - only accessible with valid token
 */
function getProtected(req, res) {
  res.json({ message: `Welcome, ${req.user.username}` });
}

module.exports = {
  generateToken,
  getProtected
};