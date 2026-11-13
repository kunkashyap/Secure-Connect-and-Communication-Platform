const express = require('express');
const router = express.Router();
const { signup, login, getProfile } = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');

// Public authentication routes
router.post('/signup', signup);
router.post('/login', login);

// Protected authentication routes
router.get('/me', authenticate, getProfile);

module.exports = router;
