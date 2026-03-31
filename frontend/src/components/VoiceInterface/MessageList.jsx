import { useEffect, useRef } from 'react';

export function MessageList({ messages, appState }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, appState]);

  return (
    <div className="flex flex-col gap-8 pb-12 w-full">
      {messages.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center opacity-40">
           <div className="w-16 h-16 rounded-full bg-secondary/5 border border-secondary/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-3xl text-secondary">voice_selection</span>
           </div>
           <span className="font-headline text-secondary/60 text-[10px] uppercase tracking-[0.3em] font-bold">Initiate voice uplink</span>
        </div>
      ) : (
        messages.map((msg, idx) => (
          msg.role === 'user' ? (
            <div key={idx} className="flex justify-end items-start gap-4 animate-slide-up">
              <div className="flex flex-col items-end gap-2 max-w-[80%]">
                <div className="px-5 py-3.5 rounded-[24px] rounded-tr-[4px] bg-surface-container-high text-on-surface shadow-lg">
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] font-label font-medium uppercase tracking-widest text-indigo-300/30 mr-2">Sent • Just now</span>
              </div>
            </div>
          ) : (
            <div key={idx} className="flex justify-start items-start gap-4 animate-slide-up">
              <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              </div>
              <div className="flex flex-col items-start gap-2 max-w-[80%]">
                <div className="px-5 py-3.5 rounded-[24px] rounded-tl-[4px] glass-panel border border-secondary/10 text-on-surface shadow-2xl relative overflow-hidden group">
                  {/* Stitch's Animated Accent Line */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary shadow-[0_0_12px_rgba(74,225,131,0.5)]"></div>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] font-label font-medium uppercase tracking-widest text-secondary/40 ml-2">Sentinel • Synchronized</span>
              </div>
            </div>
          )
        ))
      )}

      {appState === 'listening' && (
        <div className="py-12 flex flex-col items-center justify-center animate-fade-in">
            <div className="flex items-center gap-1.5 h-12">
                <div className="w-1.5 h-4 bg-secondary/20 rounded-full animate-pulse [animation-duration:1s]"></div>
                <div className="w-1.5 h-8 bg-secondary/40 rounded-full animate-pulse [animation-duration:1.2s]"></div>
                <div className="w-1.5 h-12 bg-secondary rounded-full shadow-[0_0_15px_rgba(74,225,131,0.6)] animate-pulse [animation-duration:0.8s]"></div>
                <div className="w-1.5 h-6 bg-secondary/30 rounded-full animate-pulse [animation-duration:1.1s]"></div>
                <div className="w-1.5 h-10 bg-secondary/50 rounded-full animate-pulse [animation-duration:1.4s]"></div>
                <div className="w-1.5 h-4 bg-secondary/20 rounded-full animate-pulse [animation-duration:0.9s]"></div>
            </div>
            <span className="mt-4 font-headline text-secondary/60 text-[10px] uppercase tracking-[0.2em] font-bold">Listening for command...</span>
        </div>
      )}

      {appState === 'processing' && (
        <div className="flex justify-start items-start gap-4 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-1 shadow-[0_0_15px_rgba(74,225,131,0.6)]">
             <span className="material-symbols-outlined text-secondary text-sm animate-spin-slow">sync</span>
          </div>
          <div className="px-5 py-4 rounded-[24px] rounded-tl-[4px] glass-panel border border-secondary/10 text-on-surface flex space-x-2 items-center">
               <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
               <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
               <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
