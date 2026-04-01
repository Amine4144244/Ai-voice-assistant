import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSpeechSynthesis } from './useSpeechSynthesis';

export function useVoiceSession(serverUrl) {
  const [appState, setAppState] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const socketRef = useRef(null);
  const sessionStartedRef = useRef(false);

  // Browser TTS for reading responses aloud
  const { feedChunk, flush, cancel } = useSpeechSynthesis();

  // Use refs for the speech functions to avoid dependency cycles and re-renders
  // triggering a disconnection.
  const speechCallbacks = useRef({ feedChunk, flush, cancel });
  useEffect(() => {
    speechCallbacks.current = { feedChunk, flush, cancel };
  }, [feedChunk, flush, cancel]);

  const connect = useCallback(() => {
    if (socketRef.current) return; // Already connected

    const socket = io(serverUrl, {
      transports: ['polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 10000,
      extraHeaders: {
        "x-socket-polling": "true"
      }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected. Requesting session start...');
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        socket.emit('start_session');
      }
      // CRITICAL: Do NOT automatically reset state to 'idle' here.
      // If the user was speaking, we want to stay in 'listening' or 'processing'.
      setErrorMsg(null);
    });

    socket.on('session_started', () => {
      console.log('[Socket] Session started successfully.');
    });

    socket.on('ai_response', (parsed) => {
      if (parsed.type === 'text' && parsed.content) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          // Accumulate assistant text in one bubble
          if (lastMsg && lastMsg.role === 'assistant' && parsed.role === 'assistant') {
            const updated = [...prev];
            updated[updated.length - 1] = { 
              ...lastMsg, 
              content: lastMsg.content + parsed.content 
            };
            return updated;
          } else {
            return [...prev, { role: parsed.role || 'assistant', content: parsed.content }];
          }
        });
        
        if (parsed.role === 'assistant') {
          setAppState('speaking');
          // Feed the text chunk to stable ref for TTS
          speechCallbacks.current.feedChunk(parsed.content);
        }
      }
      
      // Handle turn completion
      if (parsed.type === 'text' && parsed.final) {
        console.log('[Socket] Turn complete. Final signal received.');
        speechCallbacks.current.flush();
        setAppState('idle');
      }
    });

    socket.on('interrupted', () => {
      speechCallbacks.current.cancel(); 
      setAppState('idle');
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      // We don't clear sessionStartedRef here so that auto-reconnects 
      // don't try to start_session again on an existing socket scope.
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection Error:', err.message);
      setErrorMsg(`Connection Failed: ${err.message}.`);
      setAppState('error');
    });

  }, [serverUrl]); // Dependency list is now very small!

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      sessionStartedRef.current = false;
      speechCallbacks.current.cancel();
    };
  }, [connect]);

  const sendAudioData = useCallback((audioBuffer) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('audio_chunk', audioBuffer);
    } else {
      console.warn('[Socket] Not connected. Dropping audio chunk.');
    }
  }, []);

  const interruptSession = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('interrupt');
      speechCallbacks.current.cancel();
      setAppState('idle');
    }
  }, []);

  return {
    appState,
    setAppState,
    messages,
    errorMsg,
    connect,
    sendAudioData,
    interruptSession
  };
}
