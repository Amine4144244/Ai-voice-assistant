export function Header({ appState, isConnected }) {
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-[#1A1B41]/80 backdrop-blur-2xl bg-gradient-to-b from-[#1A1B41] to-transparent shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isConnected ? 'bg-secondary-container agent-orb-glow' : 'bg-surface-container-highest opacity-50'}`}>
          <span className={`material-symbols-outlined ${isConnected ? 'text-on-secondary' : 'text-on-surface-variant'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {isConnected ? 'blur_on' : 'blur_off'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-headline font-extrabold text-secondary tracking-widest uppercase text-xs">The Sentinel</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full transition-all ${isConnected ? 'bg-secondary shadow-[0_0_8px_rgba(74,225,131,0.8)]' : 'bg-error'}`}></div>
            <span className="text-[10px] font-label font-medium uppercase tracking-widest text-secondary/80">
              {isConnected ? `Connection Status: ${appState === 'idle' ? 'Connected' : appState.charAt(0).toUpperCase() + appState.slice(1)}` : 'Connection Status: Offline'}
            </span>
          </div>
        </div>
      </div>
      <button className="w-10 h-10 rounded-full flex items-center justify-center text-indigo-300/50 hover:bg-white/5 transition-colors">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>wifi_tethering</span>
      </button>
    </header>
  );
}
