const jwt = require('jsonwebtoken');
const generateTokenUtil = require('../utils/generateToken');

class TokenService {
  /**
   * Generates a signed JWT token
   * @param {Object} user - User document or payload
   * @returns {string} Signed JWT
   */
  generateAuthToken(user) {
    return generateTokenUtil({
      id: user._id ? user._id.toString() : user.id,
      role: user.role,
    });
  }

  /**
   * Verifies a JWT token
   * @param {string} token - Bearer JWT string
   * @returns {Object} Decoded payload
   */
  verifyToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured in environment variables');
    }
    return jwt.verify(token, secret);
  }
}

module.exports = new TokenService();
