try {
    const authRoutes = require('./routes/authRoutes');
    console.log('File found successfully');
  } catch (error) {
    console.error('Error details:', error.message);
    console.error('Current directory:', __dirname);
  }