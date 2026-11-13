const tokenService = require('../services/tokenService');
const User = require('../models/User');

/**
 * Authentication middleware verifying incoming Bearer JWT tokens.
 */
const authenticate = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied: No authentication token provided',
    });
  }

  try {
    const decoded = tokenService.verifyToken(token);

    // Verify user exists in database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied: User associated with token no longer exists',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied: Authentication token has expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied: Invalid authentication token',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Access denied: Token verification failed',
    });
  }
};

module.exports = authenticate;
