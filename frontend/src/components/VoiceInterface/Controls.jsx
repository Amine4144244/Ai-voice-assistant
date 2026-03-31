export function Controls({ appState, onMicClick, onInterrupt }) {
  const isSpeaking = appState === 'speaking';
  const isListening = appState === 'listening';
  
  return (
    <div className="fixed bottom-0 left-0 w-full z-50 flex flex-col pointer-events-none">
        <div className="w-full flex justify-center pb-12 px-6 pointer-events-auto">
            <div className="relative group">
                {/* Visual Waveform Radii */}
                <div className={`absolute inset-0 rounded-full blur-xl scale-150 transition-all duration-700 ${isListening ? 'bg-red-500/30 opacity-80 animate-pulse' : 'bg-secondary/20 opacity-50 group-hover:opacity-70'}`}></div>
                
                <button 
                    onClick={onMicClick}
                    disabled={appState === 'error'}
                    className={`relative w-20 h-20 rounded-full bg-secondary-container shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex items-center justify-center active:scale-90 transition-all duration-300 ${isListening ? 'shadow-[0_0_40px_rgba(239,68,68,0.5)] bg-red-950 text-red-100' : 'text-on-secondary'} ${appState === 'error' ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                    
                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isListening ? 'mic_off' : 'mic'}
                    </span>
                    
                    {/* Decorative Orbit from Stitch HTML */}
                    <svg className={`absolute inset-[-12px] w-[104px] h-[104px] opacity-40 ${isListening ? 'animate-spin-slow' : ''}`} viewBox="0 0 100 100">
                        <circle className={isListening ? 'text-red-500' : 'text-secondary'} cx="50" cy="50" fill="none" r="48" stroke="currentColor" strokeDasharray="4 8" strokeWidth="0.5"></circle>
                    </svg>
                </button>
            </div>
        </div>
        <nav className="w-full glass-panel rounded-t-[32px] flex justify-around items-center px-8 pb-8 pt-4 pointer-events-auto shadow-[0_-12px_40px_rgba(0,0,0,0.3)] border-t border-white/5">
            <button className="flex items-center justify-center text-indigo-200/40 p-4 hover:text-secondary transition-all active:scale-90" title="History">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>history</span>
            </button>
            
            {/* Center Gap for Mic / Conditional Interruption */}
            <div className="w-20 flex justify-center items-center">
                 {isSpeaking && (
                     <button onClick={onInterrupt} className="text-red-400 bg-red-500/10 p-2 rounded-full hover:bg-red-500/20 active:scale-90 border border-red-500/20 animate-fade-in" title="Interrupt">
                         <span className="material-symbols-outlined">stop</span>
                     </button>
                 )}
            </div>
            
            <button className="flex items-center justify-center text-indigo-200/40 p-4 hover:text-secondary transition-all active:scale-90" title="Settings">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>settings</span>
            </button>
        </nav>
    </div>
  );
}
