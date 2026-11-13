const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token containing user identity and role.
 * @param {string|Object} payload - User ID or object with id and role
 * @returns {string} Signed JWT token
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  // If payload is a string or ObjectId, convert to standard payload object
  const tokenPayload = typeof payload === 'string' || payload instanceof Object && !payload.id && payload._id
    ? { id: payload.toString() }
    : { id: payload.id || payload._id, role: payload.role };

  return jwt.sign(tokenPayload, secret, { expiresIn });
};

module.exports = generateToken;
