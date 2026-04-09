"use client";

import { useState, useRef, useEffect } from "react";
import { useDesignStore } from "@/store/designStore";
import { Sparkles, Send, Bot, User } from "lucide-react";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

let msgId = 0;

const PRESET_PROMPTS = [
  "Lightweight drone arm bracket",
  "Heat exchanger with gyroid infill",
  "Structural bracket 40x20x15mm",
  "Diamond lattice for implant",
];

function parseIntent(text: string): {
  surfaceType?: string;
  cellSize?: number;
  wallThickness?: number;
  boundingBox?: [number, number, number];
} | null {
  const lower = text.toLowerCase();
  const result: Record<string, unknown> = {};
  let matched = false;

  const surfaces = ["gyroid", "schwarz_p", "schwarz_d", "diamond", "lidinoid", "neovius"];
  for (const s of surfaces) {
    if (lower.includes(s)) {
      result.surfaceType = s;
      matched = true;
      break;
    }
  }
  if (lower.includes("heat exchang") && !result.surfaceType) {
    result.surfaceType = "gyroid";
    matched = true;
  }

  const bbMatch = lower.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/);
  if (bbMatch) {
    result.boundingBox = [
      parseInt(bbMatch[1]),
      parseInt(bbMatch[2]),
      parseInt(bbMatch[3]),
    ];
    matched = true;
  }

  const cellMatch = lower.match(/cell\s*(?:size)?\s*(\d+(?:\.\d+)?)/);
  if (cellMatch) {
    result.cellSize = parseFloat(cellMatch[1]);
    matched = true;
  }

  const wallMatch = lower.match(/wall\s*(?:thickness)?\s*(\d+(?:\.\d+)?)/);
  if (wallMatch) {
    result.wallThickness = parseFloat(wallMatch[1]);
    matched = true;
  }

  if (
    (lower.includes("lightweight") || lower.includes("drone") || lower.includes("bracket")) &&
    !result.surfaceType
  ) {
    result.surfaceType = "gyroid";
    matched = true;
  }

  if (lower.includes("implant") && !result.surfaceType) {
    result.surfaceType = "diamond";
    matched = true;
  }

  if (!matched) return null;

  return result as {
    surfaceType?: string;
    cellSize?: number;
    wallThickness?: number;
    boundingBox?: [number, number, number];
  };
}

export default function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: ++msgId,
      role: "assistant",
      content: "Hi! I am the Lattiform AI assistant. Describe the part you need and I will configure the parameters. Try: Gyroid heat exchanger 40x40x20mm",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setTPMSParam, setMode, generate, log } = useDesignStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages]);

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput("");

    const userMsg: Message = { id: ++msgId, role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);

    const intent = parseIntent(msg);
    let reply: string;

    if (intent) {
      setMode("tpms");

      if (intent.surfaceType) {
        setTPMSParam("surfaceType", intent.surfaceType as "gyroid");
      }
      if (intent.cellSize) {
        setTPMSParam("cellSize", intent.cellSize);
      }
      if (intent.wallThickness) {
        setTPMSParam("wallThickness", intent.wallThickness);
      }
      if (intent.boundingBox) {
        setTPMSParam("boundingBox", intent.boundingBox);
      }

      const parts: string[] = [];
      if (intent.surfaceType) parts.push("surface: " + intent.surfaceType);
      if (intent.cellSize) parts.push("cell size: " + intent.cellSize + "mm");
      if (intent.wallThickness) parts.push("wall: " + intent.wallThickness + "mm");
      if (intent.boundingBox) parts.push("box: [" + intent.boundingBox.join(",") + "]mm");

      reply = "Parameters updated:\n" + parts.join("\n") + "\n\nClick Generate or say generate to proceed.";
      log("AI set params: " + parts.join(", "), "info");
    } else if (msg.toLowerCase().includes("generate")) {
      reply = "Starting generation...";
      setTimeout(() => {
        generate();
      }, 300);
    } else {
      reply = "I can help configure TPMS and lattice parameters. Try describing your part:\n- Gyroid 40x40x20mm cell 6\n- Diamond lattice for bracket\n- Heat exchanger wall 0.8mm";
    }

    const assistantMsg: Message = {
      id: ++msgId,
      role: "assistant",
      content: reply,
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMsg]);
    }, 400);
  }

  return (
    <div className="w-[360px] bg-cad-panel border-l border-cad-border flex flex-col shrink-0">
      <div className="h-10 flex items-center gap-2 px-4 border-b border-cad-border shrink-0">
        <Sparkles size={14} className="text-cad-accent" />
        <span className="text-xs font-semibold text-cad-text">AI Assistant</span>
        <span className="text-[10px] font-mono text-cad-text-muted ml-auto">LOCAL</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2">
            <div className="shrink-0 mt-0.5">
              {m.role === "assistant" ? (
                <Bot size={16} className="text-cad-accent" />
              ) : (
                <User size={16} className="text-cad-text-muted" />
              )}
            </div>
            <div
              className={
                "text-xs leading-relaxed whitespace-pre-wrap " +
                (m.role === "assistant" ? "text-cad-text-secondary" : "text-cad-text")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        {PRESET_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => handleSend(p)}
            className="text-[10px] font-mono bg-cad-input border border-cad-border rounded-full px-2.5 py-1 text-cad-text-muted hover:text-cad-text hover:border-cad-accent transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-cad-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="Describe your part..."
            className="flex-1 bg-cad-input border border-cad-border rounded px-3 py-2 text-xs text-cad-text placeholder:text-cad-text-muted font-mono focus:outline-none focus:border-cad-accent transition-colors"
          />
          <button
            onClick={() => handleSend()}
            className="bg-cad-accent hover:bg-cad-accent-hover text-white rounded px-3 py-2 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
