const Message = require('../models/Message');

/**
 * Get message history for a chat room
 * GET /api/chat/rooms/:roomId/messages
 */
const getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Return in chronological order
    messages.reverse();

    return res.status(200).json({
      success: true,
      message: 'Chat room messages retrieved successfully',
      data: {
        roomId,
        count: messages.length,
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoomMessages,
};
