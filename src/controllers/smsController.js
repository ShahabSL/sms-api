const fs = require('fs');
const path = require('path');
const smsService = require('../services/smsService');

/**
 * Handle BulkVS webhooks
 */
function handleBulkVSWebhook(req, res) {
  console.log('Inbound SMS webhook received at /api/BulkVS/V1');
  
  try {
    // Extract the SMS data from the request body
    const { From, To, Message } = req.body;
    
    // Log the entire request body for debugging
    console.log('Webhook payload:', req.body);
    
    // Validate the required fields
    if (!From || !To || !Message) {
      console.error('Invalid webhook payload: Missing required fields');
      // Still return 200 OK as required by BulkVS, but log the error
      return res.status(200).json({ 
        success: false, 
        message: 'Invalid webhook payload: Missing required fields'
      });
    }
    
    // Log the received SMS
    console.log('Inbound SMS received:', {
      from: From,
      to: Array.isArray(To) ? To[0] : To, // Handle both array and string formats
      message: Message,
      timestamp: new Date().toISOString()
    });
    
    // Process the inbound SMS
    smsService.processInboundSMS(
      From, 
      Array.isArray(To) ? To[0] : To, 
      Message
    );
    
    // Return 200 OK as required by BulkVS
    res.status(200).json({ 
      success: true, 
      message: 'SMS received successfully' 
    });
  } catch (error) {
    console.error('Error processing inbound SMS:', error);
    
    // Still return 200 OK as required by BulkVS, but include error details
    res.status(200).json({ 
      success: false, 
      message: 'Error processing SMS, but webhook received'
    });
  }
}

/**
 * Handle VoIP Innovations V1 webhooks
 */
function handleVIV1Webhook(req, res) {
  try {
    // Log complete request details for maximum visibility
    console.log('==== INCOMING VI WEBHOOK ====');
    console.log('Headers:', req.headers);
    console.log('Query Parameters:', req.query);
    console.log('Body (raw):', req.body);
    
    // Log raw request data in case it's not properly parsed
    if (req.rawBody) {
      console.log('Raw Body:', req.rawBody);
    }
    
    // Create a complete log record for debugging
    const logRecord = {
      timestamp: new Date().toISOString(),
      headers: req.headers,
      query: req.query,
      body: req.body,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    };
    
    // Write to a log file for persistent storage
    try {
      const logsDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      fs.appendFileSync(
        path.join(logsDir, 'vi_webhook_logs.json'), 
        JSON.stringify(logRecord) + '\n',
        'utf8'
      );
    } catch (logError) {
      console.error('Error writing to log file:', logError);
    }
    
    // Extract the available information from whatever format they're sending
    const messageType = req.body.messageType || 'UNKNOWN';
    const text = req.body.text || '';
    
    // Log the message
    console.log(`Received ${messageType}: "${text}"`);
    
    // Process the message with available information
    smsService.processSmsMessageVI(messageType, text, req);
    
    // Respond with success
    res.status(200).json({
      success: true,
      message: 'Message received and processed'
    });
  } catch (error) {
    console.error('Error processing incoming webhook:', error);
    
    // Still return 200 to prevent retries
    res.status(200).json({
      success: false,
      error: 'Failed to process the message, but received it'
    });
  }
}

/**
 * Handle VoIP Innovations V2 webhooks
 */
function handleVIV2Webhook(req, res) {
  try {
    // Log complete request details for maximum visibility
    console.log('==== INCOMING VI REST API WEBHOOK ====');
    console.log('Headers:', req.headers);
    console.log('Query Parameters:', req.query);
    console.log('Body (raw):', req.body);
    
    // Log raw request data in case it's not properly parsed
    if (req.rawBody) {
      console.log('Raw Body:', req.rawBody);
    }
    
    // Create a complete log record for debugging
    const logRecord = {
      timestamp: new Date().toISOString(),
      headers: req.headers,
      query: req.query,
      body: req.body,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    };
    
    // Write to a log file for persistent storage
    try {
      const logsDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      fs.appendFileSync(
        path.join(logsDir, 'vi_rest_webhook_logs.json'), 
        JSON.stringify(logRecord) + '\n',
        'utf8'
      );
    } catch (logError) {
      console.error('Error writing to log file:', logError);
    }
    
    // Extract the SMS data from the request body
    const { 
      messageType = 'UNKNOWN',
      text = '',
      to = '',
      from = ''
    } = req.body;
    
    // Log the received message
    console.log(`Received ${messageType}: From ${from} to ${to}: "${text}"`);
    
    // Process the incoming message
    if (messageType === 'SMS') {
      smsService.processInboundSMS(from, to, text);
    } else if (messageType === 'MMS') {
      // Handle MMS - log it for now
      console.log('Received MMS message with possible attachments');
      
      // Process as SMS for now (just using the text component)
      smsService.processInboundSMS(from, to, text);
    }
    
    // Respond with success
    res.status(200).json({
      success: true,
      message: 'Message received and processed'
    });
    
  } catch (error) {
    console.error('Error processing incoming webhook:', error);
    
    // Always return 200 to prevent retries
    res.status(200).json({
      success: false,
      error: 'Failed to process the message, but received it'
    });
  }
}

/**
 * Send SMS via BulkVS
 */
async function sendBulkVSSMS(req, res) {
  console.log('SMS send request received');
  
  const { to, message, from } = req.body;
  
  // Validate required fields
  if (!to || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: to and message are required' 
    });
  }
  
  // Validate message length
  if (message.length > 160) {
    return res.status(400).json({
      success: false,
      error: 'Message exceeds maximum length of 160 characters'
    });
  }
  
  const result = await smsService.sendBulkVSSMS(to, message, from);
  
  if (result.success) {
    res.status(200).json({
      success: true,
      data: result.data
    });
  } else {
    res.status(result.statusCode || 500).json({
      success: false,
      error: result.error
    });
  }
}

/**
 * Send SMS via VoIP Innovations REST API
 */
async function sendVIRestSMS(req, res) {
  try {
    const { from, to, message } = req.body;
    
    // Validate input
    if (!from || !to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'From number, to number, and message are required' 
      });
    }
    
    const result = await smsService.sendVIRestSMS(from, to, message);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'SMS sent successfully',
        details: result.details
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code || ''
      });
    }
  } catch (error) {
    console.error('Error in sendVIRestSMS controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS',
      message: error.message
    });
  }
}

module.exports = {
  handleBulkVSWebhook,
  handleVIV1Webhook,
  handleVIV2Webhook,
  sendBulkVSSMS,
  sendVIRestSMS
};