const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const { authenticateToken } = require('../middleware/auth');

// SMS routes
router.post('/BulkVS/V1', smsController.handleBulkVSWebhook);
router.post('/VI/V1', smsController.handleVIV1Webhook);
router.post('/VI/V2', smsController.handleVIV2Webhook);

// SMS sending routes
router.post('/BulkVS/V1/send', authenticateToken, smsController.sendBulkVSSMS);
router.post('/VI/V2/send', authenticateToken, smsController.sendVIRestSMS);

module.exports = router;