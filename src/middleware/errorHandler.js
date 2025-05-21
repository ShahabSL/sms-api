/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
    console.error('Server error:', err);
    
    // Return a generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
  }
  
  module.exports = errorHandler;