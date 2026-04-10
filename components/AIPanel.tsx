"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDesignStore } from "@/store/designStore";
import { streamChat, extractParams, extractCEM, stripBlocks } from "@/lib/chat";
import type { ChatMessage, ParsedParams, ParsedCEM } from "@/lib/chat";
import type { CEMParams } from "@/lib/api";
import { Send, Sparkles, Trash2, Zap, Bot, User } from "lucide-react";

const PRESETS = [
  { label: "CPU Cooling Plate", prompt: "Cooling plate for Raspberry Pi 5, aluminum SLM, 85x56x10mm" },
  { label: "Drone Bracket", prompt: "Lightweight drone arm bracket, nylon SLS, 60x25x15mm" },
  { label: "Bone Scaffold", prompt: "Tibial bone scaffold, titanium, 20x20x15mm with porous core" },
  { label: "Vibration Damper", prompt: "Vibration damper for EV motor, 50x50x25mm, energy absorbing" },
  { label: "Graded Filter", prompt: "Air filter with graded porosity, 30x30x50mm" },
];

export default function AIPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingParams, setPendingParams] = useState<ParsedParams | null>(null);
  const [pendingCEM, setPendingCEM] = useState<ParsedCEM | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const applyParams = useDesignStore((s) => s.applyParams);
  const generateFromCEM = useDesignStore((s) => s.generateFromCEM);
  const generate = useDesignStore((s) => s.generate);
  const log = useDesignStore((s) => s.log);
  const status = useDesignStore((s) => s.status);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInput(""); setError(null);
    setPendingParams(null); setPendingCEM(null); setStreaming(true);
    let content = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    await streamChat(newMessages,
      (token) => {
        content += token;
        setMessages((prev) => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content };
          return u;
        });
      },
      () => {
        setStreaming(false);
        const cem = extractCEM(content);
        if (cem) { setPendingCEM(cem); log("CEM model received from AI", "info"); return; }
        const params = extractParams(content);
        if (params) { setPendingParams(params); applyParams(params); log("Parameters applied from AI", "info"); }
      },
      (err) => { setStreaming(false); setError(err); log("AI error: " + err, "error"); }
    );
  }, [messages, streaming, applyParams, log]);

  const handleGenerateCEM = useCallback(() => {
    if (!pendingCEM) return;
    const cemParams: CEMParams = {
      name: pendingCEM.name, envelope: pendingCEM.envelope,
      shellThickness: pendingCEM.shellThickness || 0,
      fill: pendingCEM.fill, regions: pendingCEM.regions,
      manufacturing: pendingCEM.manufacturing,
      resolution: pendingCEM.resolution || "low",
    };
    setPendingCEM(null);
    generateFromCEM(cemParams);
  }, [pendingCEM, generateFromCEM]);

  const handleGenerateParams = useCallback(() => {
    if (!pendingParams) return;
    applyParams(pendingParams); setPendingParams(null); generate();
  }, [pendingParams, applyParams, generate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <div className="flex flex-col h-full bg-cad-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cad-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cad-accent to-cad-secondary flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-cad-text">Design Agent</span>
            <span className="text-2xs text-cad-text-dim ml-2 font-mono">GPT-4o-mini</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setPendingParams(null); setPendingCEM(null); setError(null); }}
            className="p-1.5 rounded-md hover:bg-cad-surface text-cad-text-dim hover:text-cad-text-muted transition-all duration-150"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-cad-text-secondary leading-relaxed">
              Describe your part. The AI generates a Computational Engineering Model with variable density, functional regions, and manufacturing constraints.
            </p>
            <div className="space-y-1.5">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(p.prompt)}
                  disabled={streaming}
                  className="card-interactive w-full text-left px-3 py-2.5 group"
                >
                  <span className="text-2xs text-cad-accent font-medium">{p.label}</span>
                  <p className="text-2xs text-cad-text-muted mt-0.5 group-hover:text-cad-text-secondary transition-colors">{p.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={"flex gap-2.5 animate-slide-up " + (msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={
              "w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 " +
              (msg.role === "user" ? "bg-cad-surface" : "bg-gradient-to-br from-cad-accent/20 to-cad-secondary/20")
            }>
              {msg.role === "user" ? <User size={12} className="text-cad-text-muted" /> : <Bot size={12} className="text-cad-accent" />}
            </div>
            <div className={
              "max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed " +
              (msg.role === "user"
                ? "bg-cad-accent/15 text-cad-text border border-cad-accent/20"
                : "bg-cad-surface text-cad-text-secondary border border-cad-border")
            }>
              <pre className="whitespace-pre-wrap font-sans">
                {msg.role === "assistant" ? stripBlocks(msg.content) : msg.content}
              </pre>
              {msg.role === "assistant" && streaming && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-4 bg-cad-accent rounded-sm animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          </div>
        ))}

        {/* Error */}
        {error && (
          <div className="card-base border-cad-error/30 bg-cad-error-muted animate-scale-in">
            <p className="text-xs text-cad-error">{error}</p>
          </div>
        )}

        {/* Pending CEM */}
        {pendingCEM && !streaming && (
          <div className="card-base border-cad-accent/30 bg-cad-accent-muted space-y-2.5 animate-scale-in">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-cad-accent" />
              <span className="text-xs font-semibold text-cad-accent">{pendingCEM.name}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="badge-accent">{pendingCEM.fill.type}</span>
              <span className="badge-neutral">{pendingCEM.fill.modulation}</span>
              <span className="badge-neutral">{pendingCEM.envelope.join("×")}mm</span>
              {pendingCEM.regions && <span className="badge-neutral">{pendingCEM.regions.length} regions</span>}
            </div>
            <button
              onClick={handleGenerateCEM}
              disabled={status === "generating"}
              className="btn-primary w-full text-xs"
            >
              {status === "generating" ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating CEM…
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Generate CEM Model
                </>
              )}
            </button>
          </div>
        )}

        {/* Pending Params */}
        {pendingParams && !pendingCEM && !streaming && (
          <div className="card-baborder-cad-accent/30 bg-cad-accent-muted space-y-2.5 animate-scale-in">
            <p className="text-xs text-cad-accent font-medium">Parameters applied to panel</p>
            <button
              onClick={handleGenerateParams}
              disabled={status === "generating"}
              className="btn-primary w-full text-xs"
            >
              {status === "generating" ? "Generating…" : "Generate STL"}
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-cad-border">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your part requirement…"
            disabled={streaming}
            rows={1}
            className="input-base flex-1 resize-none text-xs py-2.5"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className={
              "p-2.5 rounded-lg transition-all duration-150 " +
              (input.trim() && !streaming
                ? "bg-cad-accent hover:bg-cad-accent-hover text-white shadow-glow-sm active:scale-95"
                : "bg-cad-surface text-cad-text-dim cursor-not-allowed")
            }
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
