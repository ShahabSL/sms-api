const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Authentication routes
router.post('/tokengen', authController.generateToken);
router.get('/protected', authenticateToken, authController.getProtected);

module.exports = router;