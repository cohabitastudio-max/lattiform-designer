"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDesignStore } from "@/store/designStore";
import { streamChat, extractParams, stripParamsBlock } from "@/lib/chat";
import type { ChatMessage, ParsedParams } from "@/lib/chat";

const PRESETS = [
  "I need a cooling plate for a Raspberry Pi, aluminum, 85x56x10mm",
  "Design a lightweight structural bracket 60x40x30mm for SLS nylon",
  "Bone scaffold for tibial implant, titanium, 20x20x15mm",
  "Vibration damping insert for electric motor mount, 50x50x25mm",
  "Filter element for air purification, 30x30x50mm",
];

export default function AIPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingParams, setPendingParams] = useState<ParsedParams | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const applyParams = useDesignStore((s) => s.applyParams);
  const generate = useDesignStore((s) => s.generate);
  const log = useDesignStore((s) => s.log);
  const status = useDesignStore((s) => s.status);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;

      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setError(null);
      setPendingParams(null);
      setStreaming(true);

      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      await streamChat(
        newMessages,
        (token) => {
          assistantContent += token;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantContent,
            };
            return updated;
          });
        },
        () => {
          setStreaming(false);
          const params = extractParams(assistantContent);
          if (params) {
            setPendingParams(params);
            applyParams(params);
            log("AI parameters auto-applied to panel", "info");
          }
        },
        (err) => {
          setStreaming(false);
          setError(err);
          log("AI error: " + err, "error");
        }
      );
    },
    [messages, streaming, applyParams, log]
  );

  const handleApplyAndGenerate = useCallback(() => {
    if (pendingParams) {
      applyParams(pendingParams);
      setPendingParams(null);
      generate();
    }
  }, [pendingParams, applyParams, generate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatMessage = (content: string): string => {
    return stripParamsBlock(content);
  };

  return (
    <div className="flex flex-col h-full bg-cad-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-cad-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cad-accent animate-pulse" />
          <span className="text-xs font-semibold text-cad-text tracking-wide uppercase">
            Design Agent
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              setPendingParams(null);
              setError(null);
            }}
            className="text-[10px] text-cad-text-muted hover:text-cad-text transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-cad-text-secondary mb-3">
              Describe the part you need. The AI will recommend optimal
              TPMS/lattice parameters for your application.
            </p>
            <div className="space-y-1.5">
              {PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(preset)}
                  disabled={streaming}
                  className="block w-full text-left text-[11px] text-cad-text-secondary hover:text-cad-text bg-cad-input hover:bg-cad-border rounded px-2.5 py-2 transition-colors disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              "flex " + (msg.role === "user" ? "justify-end" : "justify-start")
            }
          >
            <div
              className={
                "max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed " +
                (msg.role === "user"
                  ? "bg-cad-accent/20 text-cad-text"
                  : "bg-cad-input text-cad-text-secondary")
              }
            >
              <pre className="whitespace-pre-wrap font-sans">
                {msg.role === "assistant"
                  ? formatMessage(msg.content)
                  : msg.content}
              </pre>
              {msg.role === "assistant" &&
                streaming &&
                i === messages.length - 1 && (
                  <span className="inline-block w-1.5 h-3 bg-cad-accent animate-pulse ml-0.5" />
                )}
            </div>
          </div>
        ))}

        {error && (
          <div className="bg-cad-error/10 border border-cad-error/30 rounded px-3 py-2">
            <p className="text-[11px] text-cad-error">{error}</p>
            <button
              onClick={() => {
                setError(null);
                const lastUser = messages.filter((m) => m.role === "user").pop();
                if (lastUser) {
                  setMessages((prev) => prev.slice(0, -1));
                  sendMessage(lastUser.content);
                }
              }}
              className="text-[10px] text-cad-error hover:text-cad-error/80 underline mt-1"
            >
              Retry
            </button>
          </div>
        )}

        {pendingParams && !streaming && (
          <div className="flex flex-col gap-1.5 p-2 bg-cad-accent/10 border border-cad-accent/30 rounded">
            <p className="text-[10px] text-cad-accent">
              Parameters applied to panel
            </p>
            <button
              onClick={handleApplyAndGenerate}
              disabled={status === "generating"}
              className="w-full py-1.5 bg-cad-accent hover:bg-cad-accent-hover text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
            >
              {status === "generating" ? "Generating..." : "Generate STL"}
            </button>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-cad-border">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your part requirement..."
            disabled={streaming}
            rows={1}
            className="flex-1 bg-cad-input border border-cad-border rounded px-2.5 py-2 text-xs text-cad-text placeholder:text-cad-text-muted resize-none focus:outline-none focus:border-cad-accent disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="px-3 bg-cad-accent hover:bg-cad-accent-hover text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {streaming ? "..." : "\u2192"}
          </button>
        </div>
      </div>
    </div>
  );
}
