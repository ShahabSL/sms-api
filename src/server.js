require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Import configuration
const { PORT } = require('./config/env');

// Import middleware
const requestLogger = require('./middleware/logger');
const webhookRawBodyParser = require('./middleware/webhookParser');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const smsRoutes = require('./routes/smsRoutes');

// Create Express app
const app = express();

// Configure middleware
app.set('trust proxy', true);
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(requestLogger);
app.use(webhookRawBodyParser);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/', smsRoutes);

// Add error handler as the last middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`API server running on port ${PORT}`);
});