const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

/**
 * Authentication middleware to verify JWT tokens
 */
function authenticateToken(req, res, next) {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({success: false, error: 'not authorized' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({success: false, error: 'invalid token' });
  }
}

module.exports = {
  authenticateToken
};