# SMS Gateway API

A robust, scalable Express.js API that serves as a unified gateway for sending and receiving SMS messages through multiple service providers. This API abstracts away the complexities of different SMS provider integrations, offering a consistent interface while maintaining the flexibility to switch between providers seamlessly.


## 🚀 Features

- **Multi-Provider Support**: Integrated with BulkVS and VoIP Innovations
- **Unified API Interface**: Send messages through any supported provider using a single API
- **Provider Failover**: Automatically switch between providers if one experiences issues
- **Webhook Processing**: Receive and process incoming SMS messages from different providers
- **Comprehensive Metrics**: Track message delivery statistics across all providers
- **Secure by Design**: Environment-based configuration, proper authentication, and input validation
- **Highly Maintainable**: Clean, modular architecture with separation of concerns

## 📋 Prerequisites

- Node.js (v14.x or higher)
- npm or yarn
- BulkVS account with API credentials
- VoIP Innovations account with API credentials

## 🔧 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sms-api.git
   cd sms-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your provider credentials:
   ```
   # BulkVS Configuration
   BULKVS_API_KEY=your_api_key_here
   BULKVS_API_SECRET=your_api_secret_here
   BULKVS_SENDER_ID=your_sender_id
   
   # VoIP Innovations Configuration
   VOIP_INNOVATIONS_USERNAME=your_username
   VOIP_INNOVATIONS_PASSWORD=your_password
   VOIP_INNOVATIONS_FROM_NUMBER=your_from_number
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```
