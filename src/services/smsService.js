const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { formatPhoneNumber, formatWithCountryCode } = require('../utils/formatters');
const { createSoap11Envelope } = require('../utils/xmlHelpers');
const { 
  VI_API_URL, 
  VI_API_USERNAME, 
  VI_API_PASSWORD, 
  BULKVS_AUTH_TOKEN, 
  BULKVS_FROM_NUMBER 
} = require('../config/env');

/**
 * Process an inbound SMS message
 */
function processInboundSMS(from, to, message) {
  // This is where you would implement your business logic
  console.log(`Processing SMS: From ${from} to ${to}: "${message}"`);
  
  // Example: Store in database (pseudo-code)
  // db.query('INSERT INTO inbound_sms (from_number, to_number, message, received_at) VALUES (?, ?, ?, NOW())', 
  //   [from, to, message]);
  
  // Example: Forward the SMS to another system or notify users
  // You could send an email, push notification, or call another API
}

/**
 * Process an inbound SMS message from VI API
 */
function processSmsMessageVI(messageType, text, req) {
  // Extract any additional information from headers or URL
  const to = req.query.to || 'unknown'; // Check if DID is in query parameters
  const from = req.query.from || 'unknown'; // Check if sender is in query parameters
  
  // Log processing attempt
  console.log(`Processing message: Type=${messageType}, Text=${text}, To=${to}, From=${from}`);
  
  // Store in database with available information
  // Additional processing as needed
}

/**
 * Send SMS via BulkVS API
 */
async function sendBulkVSSMS(to, message, from) {
  try {
    // Convert 'to' to an array if it's not already
    const toNumbers = Array.isArray(to) ? to : [to];
    
    // Use from number from request or default from env
    const fromNumber = from || BULKVS_FROM_NUMBER;
    
    // Prepare the request configuration
    const config = {
      method: 'post',
      url: 'https://portal.bulkvs.com/api/v1.0/messageSend',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${BULKVS_AUTH_TOKEN}`
      },
      data: {
        'From': fromNumber,
        'To': toNumbers,
        'Message': message
      }
    };
    
    // Send the SMS
    const response = await axios(config);
    console.log('SMS sent successfully:', response.data);
    
    return {
      success: true,
      data: {
        messageId: response.data.messageId || response.data.id || 'unknown',
        status: response.data.status || 'sent',
        to: toNumbers,
        from: fromNumber,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Error sending SMS:', error.response ? error.response.data : error.message);
    
    let errorMessage = 'Failed to send SMS';
    let statusCode = 500;
    if (error.response) {
      errorMessage = `BulkVS API error: ${JSON.stringify(error.response.data)}`;
      statusCode = error.response.status;
    } else if (error.request) {
      errorMessage = 'No response received from BulkVS API';
    } else {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      statusCode
    };
  }
}

/**
 * Send SMS via VoIP Innovations REST API
 */
async function sendVIRestSMS(from, to, message) {
  try {
    // Format phone numbers to include country code (API requires it)
    const formattedFrom = formatWithCountryCode(from);
    const formattedTo = formatWithCountryCode(to);
    
    // Create Basic Auth token
    const authToken = Buffer.from(`${VI_API_USERNAME}:${VI_API_PASSWORD}`).toString('base64');
    
    // Prepare request data based on their documentation
    const requestData = {
      to: formattedTo,
      from: formattedFrom,
      messageType: 'SMS',
      text: message
    };
    
    // Make REST API request
    const response = await axios({
      method: 'post',
      url: 'https://mysmsforward.com/sms/out/',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authToken}`
      },
      data: requestData
    });
    
    // Process the response
    const responseData = response.data;
    
    // Check for API errors
    if (responseData.status !== 'OK') {
      return {
        success: false,
        error: responseData.data || 'Failed to send SMS',
        code: responseData.code
      };
    }
    
    // Return success response
    return {
      success: true,
      details: {
        uuid: responseData.uuid,
        status: responseData.status,
        code: responseData.code,
        remoteIds: responseData.remote_ids
      }
    };
    
  } catch (error) {
    console.error('Error sending SMS via REST API:', error);
    
    let errorMessage = 'Failed to send SMS';
    let errorDetails = {};
    
    if (error.response) {
      errorMessage = 'API Error';
      errorDetails = {
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.request) {
      errorMessage = 'No response from API';
      errorDetails = {
        request: error.request.method + ' ' + error.request.path
      };
    } else {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      details: errorDetails
    };
  }
}

module.exports = {
  processInboundSMS,
  processSmsMessageVI,
  sendBulkVSSMS,
  sendVIRestSMS
};