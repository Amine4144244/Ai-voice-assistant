import { useCallback } from 'react';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { Header } from './VoiceInterface/Header';
import { MessageList } from './VoiceInterface/MessageList';
import { Controls } from './VoiceInterface/Controls';

export function VoiceChatContainer() {
  const { 
    appState, 
    setAppState, 
    messages, 
    errorMsg, 
    sendAudioData, 
    interruptSession 
  } = useVoiceSession(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000');

  // Memoize the callback so the recorder hook doesn't re-create on every render
  const onAudioData = useCallback((audioBuffer) => {
    console.log('[UI] Sending audio:', audioBuffer.byteLength, 'bytes');
    sendAudioData(audioBuffer);
  }, [sendAudioData]);

  const { startRecording, stopRecording } = useAudioRecorder(onAudioData);

  const handleMicClick = useCallback(async () => {
    if (appState === 'idle' || appState === 'speaking') {
      if (appState === 'speaking') {
        interruptSession();
      }
      try {
        await startRecording();
        setAppState('listening');
      } catch (err) {
        console.error("Mic access failed", err);
        setAppState('idle'); 
        if (err.name === 'NotAllowedError') {
          alert("Microphone Access Denied: Please check your browser's address bar and grant permission for localhost:5173.");
        } else {
          alert(`Mic Error: ${err.message}`);
        }
      }
    } else if (appState === 'listening') {
      stopRecording();
      setAppState('processing');
    }
  }, [appState, startRecording, stopRecording, setAppState, interruptSession]);

  const isConnected = appState !== 'error';

  return (
    <div className="font-body text-on-surface selection:bg-secondary/30 relative min-h-screen">
      <Header appState={appState} isConnected={isConnected} />
      
      <main className="pt-28 pb-40 px-6 max-w-4xl mx-auto h-screen overflow-y-auto hide-scrollbar flex flex-col gap-12">
        {errorMsg && (
          <div className="w-full p-4 mb-4 bg-error-container/20 border border-error/20 rounded-[24px] text-error text-center text-sm font-medium animate-fade-in">
            {errorMsg}
          </div>
        )}

        <MessageList messages={messages} appState={appState} />

        {/* Asymmetric Context Card */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-auto mb-4">
          <div className="md:col-span-2 p-6 rounded-[32px] bg-surface-container-low border border-outline-variant/5 hover:border-secondary/20 transition-colors group">
            <h3 className="font-headline text-lg font-bold text-on-surface mb-1">Project Milestone Alpha</h3>
            <p className="text-sm text-on-surface-variant mb-4">Current progress: 84% completed across all departments.</p>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[84%] rounded-full shadow-[0_0_8px_rgba(74,225,131,0.4)] group-hover:shadow-[0_0_15px_rgba(74,225,131,0.6)] transition-all duration-500"></div>
            </div>
          </div>
          
          <div className="p-6 rounded-[32px] bg-secondary-container/10 border border-secondary/10 flex flex-col justify-between hover:bg-secondary-container/20 transition-all group">
            <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform">auto_awesome</span>
            <div className="mt-4">
              <span className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Insight</span>
              <p className="text-xs text-on-surface leading-tight mt-1">Velocity increased by <span className="text-secondary font-bold">12%</span> today.</p>
            </div>
          </div>
        </section>
      </main>

      <Controls 
        appState={appState} 
        onMicClick={handleMicClick} 
        onInterrupt={interruptSession} 
      />
    </div>
  );
}
