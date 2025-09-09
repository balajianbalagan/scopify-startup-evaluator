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
  ]);
  const [composer, setComposer] = useState('');
  const [mode, setMode] = useState<'default' | 'benchmarks' | 'risks'>('default');

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const resizing = useRef(false);

  useEffect(() => {
    if (open) composerRef.current?.focus();
  }, [open]);

  // scroll to bottom when messages change
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // mock handler for incoming user input — replace with API later
  function handleUserInput(input: string, currentMode: typeof mode) {
    // simple heuristic mock replies
    const text = input.toLowerCase();
    if (currentMode === 'benchmarks') {
      return [
        `Running EV/ARR and growth cohort comparisons for the provided metrics...`,
        `EV/ARR: 8x (vs. peer median 6x). Growth: 28% QoQ (top quartile).`,
      ];
    }
    if (currentMode === 'risks') {
      return [
        `Scanning for common red flags...`,
        `Found: ARR inconsistency between slides (2.0M vs 2.5M). Customer concentration: 35% revenue from top client.`,
      ];
    }
    // default mode
    if (text.includes('summary') || text.includes('summarize')) {
      return ['Generating concise summary…', 'Summary: strong product-market fit; validate churn cohorts.'];
    }
    if (text.includes('help') || text.trim().length < 4) {
      return ['Type a question about the company or choose a mode (Benchmarks/Risk).'];
    }
    // fallback
    return [`Acknowledged — running ${currentMode} analysis.`, 'Mock result: nothing critical surfaced in this quick pass.'];
  }

  // send message flow (user -> mock agent replies)
  function sendMessage() {
    const text = composer.trim();
    if (!text) return;
    const uid = `u${Date.now()}`;
    setMessages((m) => [...m, { id: uid, role: 'user', text, time: new Date().toISOString() }]);
    setComposer('');

    // get mock agent replies
    const replies = handleUserInput(text, mode);
    replies.forEach((r, idx) => {
      setTimeout(() => {
        const aid = `a${Date.now()}${idx}`;
        setMessages((m) => [...m, { id: aid, role: 'agent', text: r, time: new Date().toISOString() }]);
      }, 400 + idx * 400);
    });
  }

  // keyboard: Cmd/Ctrl+Enter to send
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  }

  // simple resize handler (drag right edge)
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
          {/* left rail */}
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            <div className="mt-auto text-[10px] text-gray-400 rotate-[-90deg] mb-6">Scopify</div>
          </div>

          {/* expanded content */}
          <div className="ml-16 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-indigo-50 flex items-center gap-3">
              <div className="rounded px-2 py-0.5 text-xs bg-white text-indigo-700 border border-indigo-100">Chat</div>
              <div className="font-medium text-indigo-800 text-sm">Scopify Agent</div>

              <div className="ml-auto flex items-center gap-2">
                <ModeButton label="Default" active={mode === 'default'} onClick={() => setMode('default')} />
                <ModeButton label="Benchmarks" active={mode === 'benchmarks'} onClick={() => setMode('benchmarks')} />
                <ModeButton label="Risk" active={mode === 'risks'} onClick={() => setMode('risks')} />
              </div>
            </div>

            {/* messages: fixed area with internal scroll */}
            <div
              ref={messagesRef}
              className="p-3 overflow-y-auto space-y-3 min-h-0"
              style={{ maxHeight: 'calc(100vh - 220px)' }} // fixed messages region; composer + header reserved ~220px
            >
              {messages.map((m) => (
                <MessageBubble key={m.id} role={m.role} text={m.text} />
              ))}
            </div>

            {/* composer area (fixed height) */}
            <div className="border-t p-3 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  ref={composerRef}
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={mode === 'default' ? 'Ask Scopify' : mode === 'benchmarks' ? 'E.g., show EV/ARR comparison' : 'E.g., list top risks'}
                  className="flex-1 min-h-[44px] max-h-28 resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
