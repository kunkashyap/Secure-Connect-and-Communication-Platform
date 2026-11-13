const validateEnv = () => {
  const required = ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
  const missing = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`[Configuration Error] Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please verify your .env file matches .env.example');
    process.exit(1);
  }
};

module.exports = validateEnv;
