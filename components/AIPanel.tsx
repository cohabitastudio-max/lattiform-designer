"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDesignStore } from "@/store/designStore";
import { streamChat, extractParams, extractCEM, stripBlocks } from "@/lib/chat";
import type { ChatMessage, ParsedParams, ParsedCEM } from "@/lib/chat";
import type { CEMParams } from "@/lib/api";

const PRESETS = [
  "Cooling plate for Raspberry Pi 5, aluminum SLM, 85x56x10mm",
  "Lightweight drone arm bracket, nylon SLS, 60x25x15mm",
  "Tibial bone scaffold, titanium, 20x20x15mm with porous core",
  "Vibration damper for EV motor, 50x50x25mm, energy absorbing",
  "Air filter with graded porosity, 30x30x50mm",
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
      (token) => { content += token;
        setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content }; return u; });
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-cad-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cad-accent animate-pulse" />
          <span className="text-xs font-semibold text-cad-text tracking-wide uppercase">Design Agent</span>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setPendingParams(null); setPendingCEM(null); setError(null); }}
            className="text-[10px] text-cad-text-muted hover:text-cad-text transition-colors">Clear</button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-cad-text-secondary mb-3">
              Describe your part. The AI generates a Computational Engineering Model with variable density, functional regions, and manufacturing constraints.
            </p>
            <div className="space-y-1.5">
              {PRESETS.map((p, i) => (
                <button key={i} onClick={() => sendMessage(p)} disabled={streaming}
                  className="block w-full text-left text-[11px] text-cad-text-secondary hover:text-cad-text bg-cad-input hover:bg-cad-border rounded px-2.5 py-2 transition-colors disabled:opacity-50">{p}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={"max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed " +
              (msg.role === "user" ? "bg-cad-accent/20 text-cad-text" : "bg-cad-input text-cad-text-secondary")}>
              <pre className="whitespace-pre-wrap font-sans">
                {msg.role === "assistant" ? stripBlocks(msg.content) : msg.content}
              </pre>
              {msg.role === "assistant" && streaming && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-3 bg-cad-accent animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="bg-cad-error/10 border border-cad-error/30 rounded px-3 py-2">
            <p className="text-[11px] text-cad-error">{error}</p>
          </div>
        )}

        {pendingCEM && !streaming && (
          <div className="flex flex-col gap-1.5 p-2 bg-cad-accent/10 border border-cad-accent/30 rounded">
            <p className="text-[10px] text-cad-accent font-medium">CEM: {pendingCEM.name}</p>
            <p className="text-[10px] text-cad-text-muted">
              {pendingCEM.fill.type} | {pendingCEM.fill.modulation} | {pendingCEM.envelope.join("x")}mm
              {pendingCEM.regions ? " | " + pendingCEM.regions.length + " regions" : ""}
            </p>
            <button onClick={handleGenerateCEM} disabled={status === "generating"}
              className="w-full py-1.5 bg-cad-accent hover:bg-cad-accent-hover text-white text-xs font-medium rounded transition-colors disabled:opacity-50">
              {status === "generating" ? "Generating CEM..." : "Generate CEM Model"}
            </button>
          </div>
        )}

        {pendingParams && !pendingCEM && !streaming && (
          <div className="flex flex-col gap-1.5 p-2 bg-cad-accent/10 border border-cad-accent/30 rounded">
            <p className="text-[10px] text-cad-accent">Parameters applied to panel</p>
            <button onClick={handleGenerateParams} disabled={status === "generating"}
              className="w-full py-1.5 bg-cad-accent hover:bg-cad-accent-hover text-white text-xs font-medium rounded transition-colors disabled:opacity-50">
              {status === "generating" ? "Generating..." : "Generate STL"}
            </button>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-cad-border">
        <div className="flex gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Describe your part requirement..." disabled={streaming} rows={1}
            className="flex-1 bg-cad-input border border-cad-border rounded px-2.5 py-2 text-xs text-cad-text placeholder:text-cad-text-muted resize-none focus:outline-none focus:border-cad-accent disabled:opacity-50" />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || streaming}
            className="px-3 bg-cad-accent hover:bg-cad-accent-hover text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {streaming ? "..." : "\u2192"}
          </button>
        </div>
      </div>
    </div>
  );
}
