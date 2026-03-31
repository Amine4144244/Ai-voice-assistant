const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Basic MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-voice-assistant')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB error:', err));

// Load models
require('./src/models/Session');
require('./src/models/Message');

// Connect WS handler
const wsHandler = require('./src/services/wsHandler');
wsHandler(io);

// Basic health route
app.get('/health', (req, res) => res.send({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Node Backend running on all interfaces on port ${PORT}`);
});
