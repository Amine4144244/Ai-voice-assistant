import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder(onAudioData) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const isStartingRef = useRef(false);
  const mimeTypeRef = useRef('');
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const minChunks = 12; // ~3 seconds minimum

  const checkAudioLevel = (analyser) => {
    // Use time domain data for better voice detection
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(dataArray);
    
    // Calculate RMS (root mean square) for amplitude
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const amplitude = (dataArray[i] - 128) / 128;
      sum += amplitude * amplitude;
      peak = Math.max(peak, Math.abs(amplitude));
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    // Use peak instead of RMS for more sensitive detection
    const level = Math.min(255, Math.round(peak * 255 * 20));
    return level;
  };

  const startRecording = useCallback(async () => {
    if (isStartingRef.current || mediaRecorderRef.current) {
      console.warn('[Recorder] Already recording or starting, ignoring.');
      return;
    }
    isStartingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Set up audio analysis for VAD
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      
      mimeTypeRef.current = mimeType;

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      let lastSpeechTime = Date.now();
      let silenceStartTime = null;

      // Monitor audio levels for voice activity detection
      const monitorLevels = () => {
        if (!analyserRef.current) return;
        
        const level = checkAudioLevel(analyserRef.current);
        console.log('[Recorder] Audio level:', level, 'chunks:', chunksRef.current.length);
        const now = Date.now();
        
        // Collect at least minChunks before considering stopping
        if (level < 3) {
          if (!silenceStartTime) {
            silenceStartTime = now;
          }
          // If silence for more than 1.5 seconds AND we have enough audio
          if (now - silenceStartTime > 1500 && chunksRef.current.length >= minChunks) {
            console.log('[Recorder] Auto-stopping due to silence');
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
              mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
              setIsRecording(false);
            }
            return;
          }
        } else {
          // Speech detected - reset silence timer
          silenceStartTime = null;
          // Force collect minChunks even if user stops quickly
          if (chunksRef.current.length >= minChunks) {
            console.log('[Recorder] Enough audio collected, auto-stopping');
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
              mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
              setIsRecording(false);
            }
            return;
          }
        }
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          animationRef.current = requestAnimationFrame(monitorLevels);
        }
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        
        console.log('[Recorder] onstop triggered, chunks collected:', chunksRef.current.length);
        
        const finalBlob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current || 'audio/webm',
        });
        console.log('[Recorder] Final blob size:', finalBlob.size, 'bytes');
        
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        
        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        if (finalBlob.size > 0) {
          console.log('[Recorder] Sending complete audio:', finalBlob.size, 'bytes');
          const arrayBuffer = await finalBlob.arrayBuffer();
          onAudioData(arrayBuffer);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      
      // Start monitoring audio levels
      monitorLevels();
    } catch (err) {
      console.error('Failed to start recording', err);
      throw err;
    } finally {
      isStartingRef.current = false;
    }
  }, [onAudioData]);

  const stopRecording = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  return { isRecording, startRecording, stopRecording };
}
