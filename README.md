# SMS API Gateway

This project is a Node.js Express application that acts as an API gateway for sending and receiving SMS messages through multiple providers (BulkVS and VoIP Innovations). It also includes a basic JWT-based authentication system.

## Features

*   **SMS Sending:** Send SMS messages via BulkVS and VoIP Innovations REST APIs.
*   **SMS Receiving:** Handle incoming SMS webhooks from BulkVS and VoIP Innovations (V1 SOAP-like and V2 REST).
*   **Multiple Provider Support:** Integrates with BulkVS and VoIP Innovations.
*   **Authentication:** JWT-based authentication for protected routes (e.g., sending SMS).
*   **Request Logging:** Logs incoming HTTP requests.
*   **Error Handling:** Centralized error handling middleware.
*   **Webhook Parsing:** Custom middleware to handle raw webhook payloads.

## Project Structure

```
.
├── src
│   ├── config          # Environment variables and configuration
│   ├── controllers     # Request handlers for different routes
│   ├── middleware      # Express middleware (auth, logging, error handling, webhook parsing)
│   ├── routes          # API route definitions
│   ├── services        # Business logic (authentication, SMS processing)
│   ├── utils           # Utility functions (crypto, formatters, XML helpers)
│   └── server.js       # Main Express server setup
├── .env.example        # Example environment variables
├── package.json        # Project dependencies and scripts
└── README.md           # This file

```

## Prerequisites

*   Node.js (version 14.x or higher recommended)
*   npm (comes with Node.js)
*   Access credentials for BulkVS and/or VoIP Innovations APIs.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the `.env.example` file:
    ```bash
    cp .env.example .env
    ```
    Then, edit the `.env` file and provide the necessary values for the following variables:

    ```env
    # Server Configuration
    HTTP_PORT=3000 # Port for the API server to listen on

    # JWT Authentication
    JWT_SECRET='your_jwt_secret_key' # Secret key for signing and verifying JSON Web Tokens (JWTs)
    DEMO_USER='demo'  # Username for demo login (used for generating a JWT)
    DEMO_PASSWORD='password123' # Plain text password for demo login (will be hashed before comparison)

    # BulkVS SMS Provider Configuration
    BULKVS_AUTH_TOKEN='your_bulkvs_auth_token' # Basic Authentication token for the BulkVS API
    BULKVS_FROM_NUMBER='your_bulkvs_sender_number' # Default phone number to use as the sender for outbound SMS via BulkVS

    # VoIP Innovations (VI) SMS Provider Configuration
    VI_API_URL='https://backoffice.voipinnovations.com/Services/APIService.asmx' # URL for the VoIP Innovations SOAP API (if used)
    VI_API_USERNAME='your_vi_api_username' # Username for VoIP Innovations API authentication
    VI_API_PASSWORD='your_vi_api_password' # Password for VoIP Innovations API authentication
    # Note: For the VI REST API (mysmsforward.com), credentials are also VI_API_USERNAME and VI_API_PASSWORD, used for Basic Auth.
    ```
    **Important:** Replace placeholder values like `'your_jwt_secret_key'` with your actual credentials and secrets.

## Running the Application

Start the server using:

```bash
npm start
```

Or, for development with automatic restarts on file changes (if `nodemon` is installed and configured in `package.json`):

```bash
npm run dev
```

The API server will typically be running on `http://127.0.0.1:3000` (or the port specified in `HTTP_PORT`).

## API Endpoints

### Authentication

*   **`POST /api/v1/auth/tokengen`**
    *   Generates a JWT token for a valid user.
    *   **Request Body:**
        ```json
        {
          "username": "your_demo_user",
          "password": "your_demo_password"
        }
        ```
    *   **Response (Success):**
        ```json
        {
          "token": "your_jwt_token"
        }
        ```
    *   **Response (Error):**
        ```json
        {
          "success": false,
          "error": "unauthorized"
        }
        ```

*   **`GET /api/v1/auth/protected`**
    *   Example protected route. Requires a valid JWT in the `Authorization` header.
    *   **Headers:** `Authorization: <your_jwt_token>`
    *   **Response (Success):**
        ```json
        {
          "message": "Welcome, your_demo_user"
        }
        ```

### SMS Webhooks (Incoming SMS)

These endpoints are designed to be called by the SMS providers when an SMS is received.

*   **`POST /api/BulkVS/V1`**
    *   Handles incoming SMS webhooks from BulkVS.
    *   Expects data format as specified by BulkVS.

*   **`POST /api/VI/V1`**
    *   Handles incoming SMS webhooks from VoIP Innovations (older V1 API, potentially SOAP or custom format).
    *   Includes special raw body parsing.

*   **`POST /api/VI/V2`**
    *   Handles incoming SMS webhooks from VoIP Innovations (newer V2 REST API).
    *   Includes special raw body parsing.

### SMS Sending (Outgoing SMS)

These endpoints require a valid JWT in the `Authorization` header.

*   **`POST /api/BulkVS/V1/send`**
    *   Sends an SMS via BulkVS.
    *   **Headers:** `Authorization: <your_jwt_token>`
    *   **Request Body:**
        ```json
        {
          "to": "recipient_phone_number", // Can be a single number (string) or an array of numbers
          "message": "Your SMS message content (max 160 chars)",
          "from": "optional_sender_phone_number" // Optional, defaults to BULKVS_FROM_NUMBER from .env
        }
        ```
    *   **Response (Success):**
        ```json
        {
          "success": true,
          "data": {
            "messageId": "message_id_from_bulkvs",
            "status": "sent",
            "to": ["recipient_phone_number"],
            "from": "sender_phone_number",
            "timestamp": "iso_timestamp"
          }
        }
        ```

*   **`POST /api/VI/V2/send`**
    *   Sends an SMS via VoIP Innovations REST API.
    *   **Headers:** `Authorization: <your_jwt_token>`
    *   **Request Body:**
        ```json
        {
          "from": "sender_phone_number_with_country_code", // e.g., "1xxxxxxxxxx"
          "to": "recipient_phone_number_with_country_code",   // e.g., "1xxxxxxxxxx"
          "message": "Your SMS message content"
        }
        ```
    *   **Response (Success):**
        ```json
        {
          "success": true,
          "message": "SMS sent successfully",
          "details": {
            "uuid": "message_uuid_from_vi",
            "status": "OK",
            // ... other details from VI API
          }
        }
        ```

## Logging

The application logs request details and errors to the console. Incoming webhook payloads from VoIP Innovations are also logged to `src/logs/vi_webhook_logs.json` and `src/logs/vi_rest_webhook_logs.json` for debugging purposes.

## Contributing

Please refer to the project's contribution guidelines (if available).

## License

This project is licensed under the [MIT License](LICENSE).
