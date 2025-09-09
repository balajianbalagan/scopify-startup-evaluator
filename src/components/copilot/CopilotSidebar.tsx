// src/components/copilot/CopilotSidebar.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Msg = {
  id: string;
  role: 'system' | 'agent' | 'user';
  text: string;
  time?: string;
};

export default function CopilotSidebar() {
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState(380);
  const [messages, setMessages] = useState<Msg[]>(() => [
    { id: 's1', role: 'system', text: 'Upload received. Spawning sub-agents…', time: 'now' },
    { id: 'a1', role: 'agent', text: 'Unit Economics running…', time: '1s' },
  ]);
  const [composer, setComposer] = useState('');
  const [mode, setMode] = useState<'default' | 'benchmarks' | 'risks'>('default');
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // focus composer when opening for keyboard-first workflows
    if (open) composerRef.current?.focus();
  }, [open]);

  function sendMessage() {
    if (!composer.trim()) return;
    const id = `u${Date.now()}`;
    setMessages((m) => [...m, { id, role: 'user', text: composer.trim(), time: 'now' }]);
    setComposer('');
    // mock agent reply (replace with real API call)
    setTimeout(() => {
      const aid = `a${Date.now()}`;
      setMessages((m) => [...m, { id: aid, role: 'agent', text: `Acknowledged — running ${mode} pipeline.`, time: 'now' }]);
    }, 700);
  }

  // keyboard: Cmd/Ctrl+Enter to send
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  }

  // simple resize handler (drag right edge)
  const resizing = useRef(false);
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizing.current) return;
      const next = Math.min(640, Math.max(300, width - e.movementX));
      setWidth(next);
    }
    function onUp() {
      resizing.current = false;
      document.body.style.cursor = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [width]);

  return (
    <AnimatePresence>
      {/* Hidden on small screens: show rail only */}
      <div className="hidden lg:flex">
        <motion.aside
          initial={{ width: 64 }}
          animate={{ width: open ? width : 64 }}
          exit={{ width: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          aria-label="Scopify Copilot"
          className="relative z-40 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden"
          style={{ minHeight: 'calc(100vh - 4rem)' }}
        >
          {/* left rail (always visible) */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-white border-r border-gray-100 flex flex-col items-center py-3 gap-3">
            <button
              aria-label={open ? 'Collapse copilot' : 'Expand copilot'}
              title={open ? 'Collapse' : 'Expand'}
              className="h-10 w-10 rounded-xl hover:bg-gray-100 flex items-center justify-center"
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2v20" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M5 9l7-7 7 7" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="h-px w-8 bg-gray-200" />

            <button className="h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center" title="Threads">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H9l-6 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            <button className="h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center" title="Files">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16l4-3h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            <button className="h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center" title="Settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2.3 16.9l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.4 4.7A2 2 0 0 1 7.23 1.87l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 11 1.1V1a2 2 0 0 1 4 0v.09c.07.5.33.96.76 1.34h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 0 1 19.4 4.4l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09c.38.43.67.93.76 1.49H21a2 2 0 0 1 0 4h-.09c-.5.07-.96.33-1.34.76z" stroke="#374151" strokeWidth="1.0" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            <div className="mt-auto text-[10px] text-gray-400 rotate-[-90deg] mb-6">Scopify</div>
          </div>

          {/* expanded content */}
          <div className="ml-16 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-indigo-50 flex items-center gap-3">
              <div className="rounded px-2 py-0.5 text-xs bg-white text-indigo-700 border border-indigo-100">Chat</div>
              <div className="font-medium text-indigo-800 text-sm">Scopify Agent</div>

              {/* Mode segmented control */}
              <div className="ml-auto flex items-center gap-2">
                <ModeButton label="Default" active={mode === 'default'} onClick={() => setMode('default')} />
                <ModeButton label="Benchmarks" active={mode === 'benchmarks'} onClick={() => setMode('benchmarks')} />
                <ModeButton label="Risk" active={mode === 'risks'} onClick={() => setMode('risks')} />
              </div>
            </div>

            {/* messages */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-0">
              {messages.map((m) => (
                <MessageBubble key={m.id} role={m.role} text={m.text} />
              ))}
              <div aria-hidden />
            </div>

            {/* composer */}
            <div className="border-t p-3 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  ref={composerRef}
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    mode === 'default' ? 'Ask Scopify or type /' : mode === 'benchmarks' ? 'E.g., show EV/ARR comparison' : 'E.g., list top risks'
                  }
                  className="flex-1 min-h-[44px] max-h-32 resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  aria-label="Scopify message composer"
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={sendMessage}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                    aria-label="Send message"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 2l-7 20 2-9 9-11z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm">Send</span>
                  </button>

                  <div className="text-xs text-gray-400 px-1">⌘↵ send</div>
                </div>
              </div>

              <div className="mt-2 flex gap-2 overflow-x-auto">
                {['/benchmarks', '/extract', '/risks', '/email-followup', '/summarize-call'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setComposer(s + ' ');
                      composerRef.current?.focus();
                    }}
                    className="text-xs px-2 py-1 rounded border border-gray-100 bg-gray-50 text-gray-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* resize handle */}
            <div
              onMouseDown={() => {
                resizing.current = true;
                document.body.style.cursor = 'ew-resize';
              }}
              className="absolute -right-2 top-0 bottom-0 w-4 cursor-ew-resize"
              aria-hidden
            />
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}

/* ---------- small UI subcomponents ---------- */

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-md text-xs ${active ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function MessageBubble({ role, text }: { role: Msg['role']; text: string }) {
  const base = 'max-w-[86%] rounded-2xl px-3 py-2 text-sm shadow-sm';
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className={`${base} bg-indigo-600 text-white`}>{text}</div>
      </div>
    );
  }
  if (role === 'system') {
    return (
      <div className="flex justify-center">
        <div className={`${base} bg-gray-100 text-gray-700`}>{text}</div>
      </div>
    );
  }
  // agent
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold text-sm">A</div>
      <div className={`${base} bg-white text-gray-900 border border-gray-100`}>{text}</div>
    </div>
  );
}
