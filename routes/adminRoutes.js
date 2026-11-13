const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  getAuditLogs,
  getSystemStats,
} = require('../controllers/adminController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

// Enforce both JWT authentication and Admin role check across all admin routes
router.use(authenticate, authorizeRoles('admin'));

router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/role', updateUserRole);
router.get('/audit-logs', getAuditLogs);
router.get('/stats', getSystemStats);

module.exports = router;
