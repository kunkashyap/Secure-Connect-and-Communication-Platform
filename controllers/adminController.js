const User = require('../models/User');
const Note = require('../models/Note');
const Message = require('../models/Message');
const { eventService } = require('../services/eventService');

/**
 * Get list of all registered users (Admin only)
 * GET /api/admin/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        count: users.length,
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific user by ID (Admin only)
 * GET /api/admin/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role (Admin only)
 * PUT /api/admin/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role is required (must be "user" or "admin")',
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get application event audit logs (Admin only)
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res) => {
  const logs = eventService.getLogs();
  return res.status(200).json({
    success: true,
    message: 'Event audit logs retrieved successfully',
    data: {
      count: logs.length,
      logs,
    },
  });
};

/**
 * Get system statistics (Admin only)
 * GET /api/admin/stats
 */
const getSystemStats = async (req, res, next) => {
  try {
    const [userCount, noteCount, messageCount] = await Promise.all([
      User.countDocuments(),
      Note.countDocuments(),
      Message.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'System statistics retrieved successfully',
      data: {
        users: userCount,
        notes: noteCount,
        messages: messageCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  getAuditLogs,
  getSystemStats,
};
