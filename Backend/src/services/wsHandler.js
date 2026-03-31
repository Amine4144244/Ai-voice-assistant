const WebSocket = require('ws');
const Session = require('../models/Session');
const Message = require('../models/Message');

// Store active connections to the Python Ai-agent
const agentConnections = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let currentSessionId = null;

    socket.on('start_session', async () => {
      // 1. Create a new Session in MongoDB
      const session = await Session.create({ sessionId: socket.id });
      currentSessionId = socket.id;
      
      // 2. Connect to Python Ai-agent WebSocket
      const pythonWsUrl = process.env.AGENT_WS_URL || 'ws://localhost:8000/ws/chat';
      const agentWs = new WebSocket(`${pythonWsUrl}/${currentSessionId}`);
      
      agentConnections.set(socket.id, agentWs);

      agentWs.on('open', () => {
        console.log(`Connected to Ai-agent for session: ${currentSessionId}`);
        socket.emit('session_started', { sessionId: currentSessionId });
      });

      agentWs.on('error', (err) => {
        console.error(`Ai-agent connection error for session ${currentSessionId}:`, err.message);
        socket.emit('error', { message: 'Ai-agent temporarily unreachable. Retrying...' });
      });

      agentWs.on('message', async (data) => {
        // Forward Ai-agent responses back to the Frontend
        // Assuming data is JSON string like { type: 'audio', payload: ... } 
        // or { type: 'text', role: 'assistant', content: ... }
        try {
          const parsed = JSON.parse(data);
          // Only save assistant messages once the completion flag is reached
          if(parsed.type === 'text' && parsed.content && (parsed.role !== 'assistant' || parsed.final)) {
            await Message.create({
              sessionId: currentSessionId,
              role: parsed.role || 'assistant',
              content: parsed.content
            });
          }
          socket.emit('ai_response', parsed);
        } catch (e) {
            // Could be binary audio
            socket.emit('ai_response_audio', data);
        }
      });

      agentWs.on('close', () => {
        console.log(`Ai-agent disconnected for session: ${currentSessionId}`);
      });
    });

    socket.on('audio_chunk', (chunk) => {
      // Forward user audio to Ai-agent
      const agentWs = agentConnections.get(socket.id);
      if (agentWs && agentWs.readyState === WebSocket.OPEN) {
        agentWs.send(chunk);
      }
    });

    socket.on('interrupt', () => {
      // Forward interruption signal
      const agentWs = agentConnections.get(socket.id);
      if (agentWs && agentWs.readyState === WebSocket.OPEN) {
        agentWs.send(JSON.stringify({ type: 'interrupt' }));
      }
      socket.emit('interrupted');
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      const agentWs = agentConnections.get(socket.id);
      if (agentWs) {
        agentWs.close();
        agentConnections.delete(socket.id);
      }
      if (currentSessionId) {
        await Session.updateOne({ sessionId: currentSessionId }, { status: 'completed', endTime: new Date() });
      }
    });
  });
};
