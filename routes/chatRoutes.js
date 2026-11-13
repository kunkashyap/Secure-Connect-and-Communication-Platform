const express = require('express');
const router = express.Router();
const { getRoomMessages } = require('../controllers/chatController');
const authenticate = require('../middleware/authMiddleware');

// Protected chat routes
router.use(authenticate);

router.get('/rooms/:roomId/messages', getRoomMessages);

module.exports = router;
