require('dotenv').config();

module.exports = {
  PORT: process.env.HTTP_PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET,
  DEMO_USER: process.env.DEMO_USER,
  DEMO_PASSWORD: process.env.DEMO_PASSWORD,
  
  // VoIP Innovations
  VI_API_URL: process.env.VI_API_URL || 'https://backoffice.voipinnovations.com/Services/APIService.asmx',
  VI_API_USERNAME: process.env.VI_API_USERNAME,
  VI_API_PASSWORD: process.env.VI_API_PASSWORD,
  
  // BulkVS
  BULKVS_AUTH_TOKEN: process.env.BULKVS_AUTH_TOKEN,
  BULKVS_FROM_NUMBER: process.env.BULKVS_FROM_NUMBER
};