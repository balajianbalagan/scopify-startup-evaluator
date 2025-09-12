"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";

// Initial chat state
const INITIAL_MESSAGES = [
  { type: "system" as const, text: "Upload received. Spawning sub-agents…" },
  { type: "agent" as const, text: "Welcome! How can I assist you today?" },
];

type Message = {
  type: "user" | "agent" | "system";
  text: string;
};

export default function CopilotSidebar() {
  // Sidebar state
  const [agentOpen, setAgentOpen] = useState(true);
  const [agentWidth, setAgentWidth] = useState<number>(384); // ~w-96
  const [resizing, setResizing] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sidebar resizing
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      setAgentWidth((w) => {
        const next = w - e.movementX;
        return Math.min(640, Math.max(280, next));
      });
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, processing]);

  // --- Chat Logic ---

  function handleSend(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim() || processing) return;
    const userMsg = input.trim();
    addUserMessage(userMsg);
    setInput("");
    setProcessing(true);
    mockAgentResponse(userMsg);
  }

  function addUserMessage(text: string) {
    setMessages((msgs) => [...msgs, { type: "user", text }]);
  }

  function addAgentMessage(text: string) {
    setMessages((msgs) => [...msgs, { type: "agent", text }]);
  }

  function mockAgentResponse(userMsg: string) {
    // Show "Processing request..." after a short delay
    setTimeout(() => {
      addAgentMessage("Processing request...");
      // Replace with mock response after another delay
      setTimeout(() => {
        setMessages((msgs) => [
          ...msgs.slice(0, -1),
          {
            type: "agent",
            text: `Here is a mock response for: "${userMsg}"`,
          },
        ]);
        setProcessing(false);
      }, 1500);
    }, 500);
  }

  function handleNewChat() {
    setMessages(INITIAL_MESSAGES);
    setInput("");
    setProcessing(false);
  }

  // --- Render ---

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={`relative flex min-h-[90vh] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden box-border`}
        style={{ width: agentOpen ? agentWidth : 56 }}
        data-testid="agent-panel"
      >
        {/* Rail (always visible) */}
        <SidebarRail agentOpen={agentOpen} setAgentOpen={setAgentOpen} />

        {/* Expanded content */}
        <AnimatePresence initial={false}>
          {agentOpen && (
            <>
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setResizing(true);
                }}
                className="absolute -left-1 top-0 h-full w-2 cursor-ew-resize z-20"
                title="Drag to resize"
              />
              <motion.div
                key="agent-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col min-w-0 overflow-hidden"
                data-testid="agent-expanded"
              >
                <ChatHeader onNewChat={handleNewChat} />
                <ChatMessages
                  messages={messages}
                  processing={processing}
                  messagesEndRef={messagesEndRef}
                />
                <ChatInput
                  input={input}
                  setInput={setInput}
                  handleSend={handleSend}
                  processing={processing}
                  textareaRef={textareaRef}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

// --- Subcomponents ---

function SidebarRail({
  agentOpen,
  setAgentOpen,
}: {
  agentOpen: boolean;
  setAgentOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div
      className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-3"
      data-testid="agent-rail"
    >
      <button
        className="h-10 w-10 rounded-xl hover:bg-gray-100 flex items-center justify-center"
        title="Toggle Agent"
        onClick={() => setAgentOpen((v) => !v)}
      >
        <span className="text-indigo-600 text-xl">★</span>
      </button>
      <div className="h-px w-8 bg-gray-200" />
      <button className="h-9 w-9 rounded-lg hover:bg-gray-100" title="Threads">
        💬
      </button>
      <button className="h-9 w-9 rounded-lg hover:bg-gray-100" title="Files">
        📎
      </button>
      <button className="h-9 w-9 rounded-lg hover:bg-gray-100" title="Settings">
        ⚙️
      </button>
      <div className="mt-auto text-[10px] text-gray-400 rotate-[-90deg] mb-6">
        Scopify
      </div>
    </div>
  );
}

function ChatHeader({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-indigo-50">
      <div className="text-sm text-indigo-800 font-medium">Scopify Agent</div>
      <div className="ml-auto flex items-center gap-2">
        <select className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white">
          <option>Default mode</option>
          <option>Benchmark mode</option>
          <option>Risk review</option>
        </select>
        <Button size="sm" variant="outline" onClick={onNewChat}>
          New Chat
        </Button>
      </div>
    </div>
  );
}

function ChatMessages({
  messages,
  processing,
  messagesEndRef,
}: {
  messages: Message[];
  processing: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-w-0">
      {messages.map((msg, idx) =>
        msg.type === "user" ? (
          <UserMsg key={idx}>{msg.text}</UserMsg>
        ) : msg.type === "agent" ? (
          <AgentMsg key={idx}>{msg.text}</AgentMsg>
        ) : (
          <SystemMsg key={idx}>{msg.text}</SystemMsg>
        )
      )}
      {processing && <AgentMsg>Processing request…</AgentMsg>}
      <div ref={messagesEndRef} />
    </div>
  );
}

function ChatInput({
  input,
  setInput,
  handleSend,
  processing,
  textareaRef,
}: {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend: (e?: FormEvent) => void;
  processing: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <div className="border-t border-gray-200 bg-white p-2" data-testid="command-bar">
      <form className="flex flex-col gap-3 w-full" onSubmit={handleSend}>
        <div className="flex items-center gap-3 order-3 w-full" data-testid="command-row">
          <div className="flex items-center gap-3 text-gray-600">
            <button
              type="button"
              className="h-9 w-9 rounded-lg hover:bg-gray-100"
              title="Slash commands"
              tabIndex={-1}
            >
              /
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-lg hover:bg-gray-100"
              title="Variables"
              tabIndex={-1}
            >
              #
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-lg hover:bg-gray-100"
              title="Attach file"
              tabIndex={-1}
            >
              📎
            </button>
          </div>
          <Button
            size="sm"
            className="ml-auto"
            type="submit"
            disabled={processing || !input.trim()}
          >
            Send
          </Button>
        </div>
        <div className="w-full order-1" data-testid="composer">
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder="Ask Scopify or type / for commands…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-black"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={processing}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !processing
              ) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div
            className="mt-2 overflow-x-auto whitespace-nowrap flex gap-2"
            data-testid="suggestions-row"
          >
            <Hint>/benchmarks</Hint>
            <Hint>/extract</Hint>
            <Hint>/risks</Hint>
            <Hint>/email-followup</Hint>
            <Hint>/compare-peers</Hint>
            <Hint>/summarize-call</Hint>
            <Hint>/flag-inconsistency</Hint>
          </div>
        </div>
      </form>
    </div>
  );
}

// --- Utility Components ---

function Badge({ children }: { children: any }) {
  return (
    <span className="inline-flex items-center text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
      {children}
    </span>
  );
}

function Hint({ children }: { children: any }) {
  return (
    <span className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-600">
      {children}
    </span>
  );
}

function UserMsg({ children }: { children: any }) {
  return (
    <div className="flex w-full justify-end">
      <Bubble role="user">{children}</Bubble>
    </div>
  );
}

function AgentMsg({ children }: { children: any }) {
  return (
    <div className="flex w-full">
      <Bubble role="agent">{children}</Bubble>
    </div>
  );
}

function SystemMsg({ children }: { children: any }) {
  return (
    <div className="flex w-full">
      <Bubble role="system">{children}</Bubble>
    </div>
  );
}

function Bubble({
  children,
  role,
}: {
  children: any;
  role?: "agent" | "user" | "system";
}) {
  const base = "max-w-[90%] rounded-2xl px-3 py-2 text-sm shadow-sm";
  if (role === "user")
    return <div className={`self-end bg-indigo-600 text-white ${base}`}>{children}</div>;
  if (role === "system")
    return (
      <div className={`self-center bg-gray-100 text-gray-700 ${base}`}>{children}</div>
    );
  return <div className={`self-start bg-white text-black ${base}`}>{children}</div>;
}