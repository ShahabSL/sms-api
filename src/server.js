require('dotenv').config();
const express = require('express');
const app = express();
// const pool = require('./database')
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const https = require('https');
const path = require('path');
const xml2js = require('xml2js');

// Add strong-soap for SOAP API calls
const soap = require('strong-soap').soap;
const { promisify } = require('util');

//trust proxy headers
app.set('trust proxy', true);

//jwt auth
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET

//jwt auth end


// SSL certificate options - using relative paths within the project
// const sslOptions = {
//   key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
//   cert: fs.readFileSync(path.join(__dirname, 'ssl', 'crt.pem')),
//   ca: fs.readFileSync(path.join(__dirname, 'ssl', 'chain.pem'))
// };

//sha256
const crypto = require('crypto');
const { error } = require('console');
function sha256(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}
//sha256 end


// Environment variables
const VI_API_URL = process.env.VI_API_URL || 'https://backoffice.voipinnovations.com/Services/APIService.asmx'; // SOAP endpoint
const VI_API_USERNAME = process.env.VI_API_USERNAME;
const VI_API_PASSWORD = process.env.VI_API_PASSWORD;

// Helper function to format phone numbers
function formatPhoneNumber(phoneNumber) {
  // Handle null or undefined input
  if (!phoneNumber) return '';
  
  // Convert to string if it's not already
  const phoneStr = phoneNumber.toString();
  
  // Remove any non-digit characters
  const digitsOnly = phoneStr.replace(/\D/g, '');

  // Ensure it has 10 digits (US numbers)
  if (digitsOnly.length === 10) {
    return digitsOnly;
  }

  // If it already has country code (11 digits for US)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return digitsOnly.substring(1); // Remove the '1' country code
  }

  return phoneStr; // Return as-is if format is unclear
}





//csrf if needed
app.use(cors());


app.use(express.static('public'));
// parse form data
app.use(express.urlencoded({ extended: false }))
// parse json
app.use(express.json())

// XML parser for handling SOAP responses
const xmlParser = new xml2js.Parser({
  explicitArray: false,
  tagNameProcessors: [xml2js.processors.stripPrefix]
});

//jwt auth
function authenticateToken(req, res, next) {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({success: false, error: 'not authorized' });
    }
    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({success: false, error: 'invalid token' });
    }
}

// Example function to process inbound SMS
function processInboundSMS(from, to, message) {
    // This is where you would implement your business logic
    console.log(`Processing SMS: From ${from} to ${to}: "${message}"`);
    
    // Example: Store in database (pseudo-code)
    // db.query('INSERT INTO inbound_sms (from_number, to_number, message, received_at) VALUES (?, ?, ?, NOW())', 
    //   [from, to, message]);
    
    // Example: Forward the SMS to another system or notify users
    // You could send an email, push notification, or call another API
  }
  

app.post('/api/v1/tokengen', (req, res) => {
    console.log('hit tokengen')
    
    let { username, password } = req.body;
    password = sha256(password);
    console.log(password);
    console.log(process.env.DEMO_USER);
    console.log(process.env.DEMO_PASSWORD);
    // Check if the username and password are valid
    if (username === process.env.DEMO_USER && password === process.env.DEMO_PASSWORD) {
        const token = jwt.sign({ username: username }, process.env.JWT_SECRET);
        res.json({ token});
    }
    else{
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
    }
});
    
//test protected
app.get('/v1/protected',authenticateToken, (req, res) => {
    res.json({ message: `Welcome, Jane` });
});


// BulkVS Inbound SMS webhook handler - MUST match the exact URL they configured
app.post('/api/BulkVS/V1', (req, res) => {
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
      processInboundSMS(
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
  });

// BulkVS SMS sending route with multiple recipient support
app.post('/api/BulkVS/V1/send', authenticateToken, (req, res) => {
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
  
  // Convert 'to' to an array if it's not already
  // This handles both single recipient and multiple recipients
  const toNumbers = Array.isArray(to) ? to : [to];
  
  // Use from number from request or default from env
  const fromNumber = from || process.env.BULKVS_FROM_NUMBER;
  
  // Prepare the request configuration
  const config = {
      method: 'post',
      url: 'https://portal.bulkvs.com/api/v1.0/messageSend',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.BULKVS_AUTH_TOKEN}`
      },
      data: {
        'From': fromNumber,
        'To': toNumbers,
        'Message': message
      }
    };
    
    // Send the SMS
    axios(config)
      .then(response => {
        console.log('SMS sent successfully:', response.data);
        res.status(200).json({
          success: true,
          data: {
            messageId: response.data.messageId || response.data.id || 'unknown',
            status: response.data.status || 'sent',
            to: toNumbers,
            from: fromNumber,
            timestamp: new Date().toISOString()
          }
        });
      })
      .catch(error => {
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
        
        res.status(statusCode).json({
          success: false,
          error: errorMessage
        });
      });
});
    
// Webhook endpoint for receiving SMS VOIP Innovations
app.post('/api/VI/V1', (req, res) => {
  try {
    // Log complete request details for maximum visibility
    console.log('==== INCOMING VI WEBHOOK ====');
    console.log('Headers:', req.headers);
    console.log('Query Parameters:', req.query);
    console.log('Body (raw):', req.body);
    console.log('Body (stringified):', JSON.stringify(req.body, null, 2));
    console.log('URL:', req.originalUrl);
    console.log('Method:', req.method);
    console.log('IP Address:', req.ip);
    console.log('Content-Type:', req.headers['content-type']);
    
    // Log raw request data in case it's not properly parsed
    let rawData = '';
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
      fs.appendFileSync(
        path.join(__dirname, 'vi_webhook_logs.json'), 
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
    processSmsMessageVI(messageType, text, req);
    
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
});

// Function to process incoming SMS with limited information
function processSmsMessageVI(messageType, text, req) {
  // Extract any additional information from headers or URL
  const to = req.query.to || 'unknown'; // Check if DID is in query parameters
  const from = req.query.from || 'unknown'; // Check if sender is in query parameters
  
  // Log processing attempt
  console.log(`Processing message: Type=${messageType}, Text=${text}, To=${to}, From=${from}`);
  
  // Store in database with available information
  // Example with MongoDB:
  /*
  const smsMessage = new SmsMessage({
    messageType,
    text,
    to,
    from,
    receivedAt: new Date(),
    headers: req.headers, // Store headers for debugging
    query: req.query, // Store query parameters for debugging
    path: req.path // Store path for debugging
  });
  await smsMessage.save();
  */
  
  // Additional processing as needed
}

// Helper function to create a SOAP 1.2 envelope for sending SMS
// ... existing code ...

// Update createSoapEnvelope function
function createSoapEnvelope(login, secret, sender, recipient, message) {
  // Use encodeURIComponent for better handling of special characters
  const escapeXml = (unsafe) => {
    // First encode special characters
    const encoded = unsafe.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return encoded;
  };
  
  // Log the escaped values for debugging
  console.log('Escaped secret:', escapeXml(secret));
  
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <SendSMS xmlns="http://tempuri.org/">
      <login>${escapeXml(login)}</login>
      <secret>${escapeXml(secret)}</secret>
      <sender>${escapeXml(sender)}</sender>
      <recipient>${escapeXml(recipient)}</recipient>
      <message>${escapeXml(message)}</message>
    </SendSMS>
  </soap12:Body>
</soap12:Envelope>`;
}

// Helper function to create a SOAP 1.1 envelope instead of 1.2
function createSoap11Envelope(login, secret, sender, recipient, message) {
  // Escape special characters in XML
  const escapeXml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SendSMS xmlns="http://tempuri.org/">
      <login>${escapeXml(login)}</login>
      <secret>${escapeXml(secret)}</secret>
      <sender>${escapeXml(sender)}</sender>
      <recipient>${escapeXml(recipient)}</recipient>
      <message>${escapeXml(message)}</message>
    </SendSMS>
  </soap:Body>
</soap:Envelope>`;
}

// Updated Send SMS endpoint using SOAP 1.1
app.post('/api/VI/V1/send', authenticateToken, async (req, res) => {
  try {
    console.log('VI SMS send request received (SOAP 1.1)');
    
    const { from, to, message } = req.body;
    
    // Validate input
    if (!from || !to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'From number, to number, and message are required' 
      });
    }
    
    // Format phone numbers if needed
    const formattedFrom = formatPhoneNumber(from);
    const formattedTo = formatPhoneNumber(to);
    
    // Create SOAP 1.1 envelope
    const soapEnvelope = createSoap11Envelope(
      VI_API_USERNAME,
      VI_API_PASSWORD,
      formattedFrom,
      formattedTo,
      message
    );
    
    console.log('Sending SOAP 1.1 request to:', VI_API_URL);
    console.log('SOAP Envelope:', soapEnvelope);
    
    // Make SOAP request using axios - note the changed headers for SOAP 1.1
    const response = await axios.post(VI_API_URL, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://tempuri.org/SendSMS',
        'Content-Length': Buffer.byteLength(soapEnvelope)
      }
    });
    
    console.log('Got response with status:', response.status);
    
    // Parse XML response
    const xmlResponse = response.data;
    console.log('Raw SOAP Response:', xmlResponse);
    
    // Parse the XML
    const parseXml = promisify(xmlParser.parseString);
    const parsedResponse = await parseXml(xmlResponse);
    console.log('Parsed SOAP Response:', JSON.stringify(parsedResponse, null, 2));
    
    // Extract response details - path is different for SOAP 1.1
    let responseCode, responseMessage, msgDetails;
    
    try {
      // Path for SOAP 1.1 response might be slightly different
      responseCode = parsedResponse.Envelope.Body.SendSMSResponse.SendSMSResult.responseCode;
      responseMessage = parsedResponse.Envelope.Body.SendSMSResponse.SendSMSResult.responseMessage;
      msgDetails = parsedResponse.Envelope.Body.SendSMSResponse.SendSMSResult.MsgDetails;
    } catch (e) {
      console.error('Error extracting data from SOAP response:', e);
      return res.status(500).json({
        success: false,
        error: 'Error parsing SOAP response',
        raw: xmlResponse
      });
    }
    
    // Check for API errors
    if (responseCode !== '100') {
      return res.status(400).json({
        success: false,
        error: responseMessage || 'Unknown API error',
        code: responseCode
      });
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'SMS sent successfully',
      details: {
        responseCode,
        responseMessage,
        uuid: msgDetails?.uuid || '',
        status: msgDetails?.status || ''
      }
    });
    
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    let errorMessage = 'Failed to send SMS';
    let errorDetails = {};
    
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      errorMessage = 'API Error';
      errorDetails = {
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.request) {
      console.error('No response received from API');
      errorMessage = 'No response from API';
      errorDetails = {
        request: error.request.method + ' ' + error.request.path
      };
    } else {
      console.error('Request error:', error.message);
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
});

// Alternative SOAP 1.1 implementation using strong-soap
app.post('/api/VI/V1/send-alt', authenticateToken, async (req, res) => {
  try {
    console.log('VI SMS send request received (using soap library for SOAP 1.1)');
    
    const { from, to, message } = req.body;
    
    // Validate input
    if (!from || !to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'From number, to number, and message are required' 
      });
    }
    
    // Format phone numbers if needed
    const formattedFrom = formatPhoneNumber(from);
    const formattedTo = formatPhoneNumber(to);

    // URL for the WSDL file
    const wsdlUrl = `${VI_API_URL}?WSDL`;
    console.log('Using WSDL URL:', wsdlUrl);
    
    // Create SOAP client with SOAP 1.1 options
    const options = {
      disableCache: true,
      forceSoap12: false, // Force SOAP 1.1
      wsdl_options: {
        timeout: 10000
      }
    };
    
    soap.createClient(wsdlUrl, options, function(err, client) {
      if (err) {
        console.error('Error creating SOAP client:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to create SOAP client',
          details: err.message
        });
      }
      
      console.log('SOAP client created successfully');
      
      // For SOAP 1.1, we need to set the SOAPAction
      client.setSecurity(new soap.BasicAuthSecurity(VI_API_USERNAME, VI_API_PASSWORD));
      
      // Set SOAP 1.1 headers if needed
      if (client.lastRequest) {
        console.log('Last SOAP Request:', client.lastRequest);
      }
      
      // Prepare parameters for SendSMS operation
      const params = {
        login: VI_API_USERNAME,
        secret: VI_API_PASSWORD,
        sender: formattedFrom,
        recipient: formattedTo,
        message: message
      };
      
      console.log('Calling SendSMS with params:', params);
      
      // Call the SendSMS method
      client.SendSMS(params, function(err, result) {
        if (err) {
          console.error('SOAP call error:', err);
          
          // Try to log the last request/response for debugging
          if (client.lastRequest) {
            console.log('Last SOAP Request:', client.lastRequest);
          }
          if (client.lastResponse) {
            console.log('Last SOAP Response:', client.lastResponse);
          }
          
          return res.status(500).json({
            success: false,
            error: 'SOAP call failed',
            details: err.message
          });
        }
        
        console.log('SOAP Result:', JSON.stringify(result, null, 2));
        
        // Extract response details
        const response = result.SendSMSResult;
        
        if (response.responseCode !== '100') {
          return res.status(400).json({
            success: false,
            error: response.responseMessage || 'Unknown API error',
            code: response.responseCode
          });
        }
        
        // Return success response
        res.status(200).json({
          success: true,
          message: 'SMS sent successfully',
          details: {
            responseCode: response.responseCode,
            responseMessage: response.responseMessage,
            uuid: response.MsgDetails?.uuid || '',
            status: response.MsgDetails?.status || ''
          }
        });
      });
    });
    
  } catch (error) {
    console.error('Error in SOAP library implementation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// New VoIP Innovations REST API endpoint
app.post('/api/VI/V2/send', authenticateToken, async (req, res) => {
  try {
    console.log('VI SMS send request received (using new REST API)');
    
    const { from, to, message } = req.body;
    
    // Validate input
    if (!from || !to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'From number, to number, and message are required' 
      });
    }
    
    // Format phone numbers to include country code (API requires it)
    const formatWithCountryCode = (number) => {
      const digitsOnly = number.toString().replace(/\D/g, '');
      // Ensure number has country code (add US code '1' if 10 digits)
      return digitsOnly.length === 10 ? '1' + digitsOnly : digitsOnly;
    };
    
    const formattedFrom = formatWithCountryCode(from);
    const formattedTo = formatWithCountryCode(to);
    
    // Create Basic Auth token
    const authToken = Buffer.from(`${process.env.VI_API_USERNAME}:${process.env.VI_API_PASSWORD}`).toString('base64');
    
    // Prepare request data based on their documentation
    const requestData = {
      to: formattedTo,
      from: formattedFrom,
      messageType: 'SMS',
      text: message,
      // Optional - uncomment if you want delivery receipts
      // dlr: true
    };
    
    console.log('Sending REST API request to: https://mysmsforward.com/sms/out/');
    console.log('Request data:', requestData);
    
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
    
    console.log('Got response with status:', response.status);
    console.log('Response data:', response.data);
    
    // Process the response
    const responseData = response.data;
    
    // Check for API errors
    if (responseData.status !== 'OK') {
      return res.status(400).json({
        success: false,
        error: responseData.data || 'Failed to send SMS',
        code: responseData.code
      });
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'SMS sent successfully',
      details: {
        uuid: responseData.uuid,
        status: responseData.status,
        code: responseData.code,
        remoteIds: responseData.remote_ids
      }
    });
    
  } catch (error) {
    console.error('Error sending SMS via REST API:', error);
    
    let errorMessage = 'Failed to send SMS';
    let errorDetails = {};
    
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      errorMessage = 'API Error';
      errorDetails = {
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.request) {
      console.error('No response received from API');
      errorMessage = 'No response from API';
      errorDetails = {
        request: error.request.method + ' ' + error.request.path
      };
    } else {
      console.error('Request error:', error.message);
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
});

// Webhook endpoint for receiving SMS from the new VoIP Innovations API
app.post('/api/VI/V2', (req, res) => {
  try {
    // Log complete request details for maximum visibility
    console.log('==== INCOMING VI REST API WEBHOOK ====');
    console.log('Headers:', req.headers);
    console.log('Query Parameters:', req.query);
    console.log('Body (raw):', req.body);
    console.log('Body (stringified):', JSON.stringify(req.body, null, 2));
    console.log('URL:', req.originalUrl);
    console.log('Method:', req.method);
    console.log('IP Address:', req.ip);
    console.log('Content-Type:', req.headers['content-type']);
    
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
      fs.appendFileSync(
        path.join(__dirname, 'vi_rest_webhook_logs.json'), 
        JSON.stringify(logRecord) + '\n',
        'utf8'
      );
    } catch (logError) {
      console.error('Error writing to log file:', logError);
    }
    
    // Extract the SMS data from the request body
    // Based on documentation, we should expect messageType, text, etc.
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
      processInboundSMS(from, to, text);
    } else if (messageType === 'MMS') {
      // Handle MMS - log it for now
      console.log('Received MMS message with possible attachments');
      
      // Check for files or fileUrls
      if (req.body.files) {
        console.log('MMS contains files:', Object.keys(req.body.files).length);
      }
      if (req.body.fileUrls) {
        console.log('MMS contains file URLs:', req.body.fileUrls);
      }
      
      // Process as SMS for now (just using the text component)
      processInboundSMS(from, to, text);
    }
    
    // Respond with success - this is important to acknowledge receipt
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
});

// Helper function to handle webhook payloads from different sources
app.use((req, res, next) => {
  if (req.originalUrl === '/api/VI/V1' || req.originalUrl === '/api/VI/V2') {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
});

// Add this immediately before the httpsServer creation line






// const httpsServer = https.createServer(sslOptions, app);
// const HTTPS_PORT = process.env.HTTPS_PORT || 8081;

// httpsServer.listen(HTTPS_PORT, () => {
//   console.log(`HTTPS server running on port ${HTTPS_PORT}`);
// });

const HTTP_PORT = process.env.HTTP_PORT || 3000;
app.listen(HTTP_PORT, '127.0.0.1', () => {
  console.log('API server running on port 3000');
});