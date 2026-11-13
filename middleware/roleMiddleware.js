/**
 * Role-Based Access Control (RBAC) middleware factory.
 * @param  {...string} allowedRoles - List of allowed roles (e.g. 'admin')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied: User authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Insufficient administrative privileges',
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
