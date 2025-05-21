/**
 * Middleware to handle raw webhook payloads
 */
function webhookRawBodyParser(req, res, next) {
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
  }
  
  module.exports = webhookRawBodyParser;