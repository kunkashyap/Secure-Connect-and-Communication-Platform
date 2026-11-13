require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const validateEnv = require('./config/validateEnv');
const connectDB = require('./config/database');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const notesRoutes = require('./routes/notesRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const initSocketHandler = require('./sockets/socketHandler');

// Validate mandatory environment variables at startup
validateEnv();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Attach Socket.IO handlers
initSocketHandler(io);

// Core Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files for browser testing interface
app.use(express.static(path.join(__dirname, 'public')));

// Root & Healthcheck endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Secure Connect and Communication Platform API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start HTTP/Socket.IO Server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` Secure Connect and Communication Platform Server`);
      console.log(` Status: RUNNING on port ${PORT}`);
      console.log(` API Base: http://localhost:${PORT}/api`);
      console.log(` Healthcheck: http://localhost:${PORT}/api/health`);
      console.log(` Web Interface: http://localhost:${PORT}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error(`Failed to launch server: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io, startServer };
