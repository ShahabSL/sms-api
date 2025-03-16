require('dotenv').config();
const express = require('express');
const app = express();
// const pool = require('./database')
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const https = require('https');
const path = require('path');


//jwt auth
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET

//jwt auth end


//load SSL certificate
// const sslKey = fs.readFileSync(path.join(__dirname, 'key.pem'));
// const sslCert = fs.readFileSync(path.join(__dirname, 'cert.pem'));
//end

//sha256
const crypto = require('crypto');
const { error } = require('console');
function sha256(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}
//sha256 end



//csrf if needed
app.use(cors());


app.use(express.static('public'));
// parse form data
app.use(express.urlencoded({ extended: false }))
// parse json
app.use(express.json())

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
        return ;
    }

});
    

//test protected
app.get('/api/v1/protected',authenticateToken, (req, res) => {

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



// BulkVS SMS sending route
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
    
    // Format the phone number if needed
    const toNumber = to;
    
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
          'To': [toNumber],
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
              to: toNumber,
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
    
//mongodev
    


  // Start the server
app.listen(3003, () => {
    console.log('Server is running on port 3003');
  });