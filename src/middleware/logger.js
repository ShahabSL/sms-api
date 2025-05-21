/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const originalUrl = req.originalUrl;
  const forwardedUrl = req.headers['x-forwarded-uri'] || '(none)';
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${originalUrl} (Forwarded: ${forwardedUrl})`);
  next();
}

module.exports = requestLogger;