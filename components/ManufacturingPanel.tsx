"use client";

import { useState } from "react";
import { useDesignStore } from "@/store/designStore";

const API = "https://lattiformapi.onrender.com";

interface PrintQuote {
  bureau: string; url: string; badge: string;
  unitPriceUsd: number; totalPriceUsd: number;
  leadTimeDays: number; compatible: boolean;
}
interface QuoteResult {
  success: boolean; partVolumeCm3: number; estimatedMassG: number;
  material: string; process: string; quantity: number;
  quotes: PrintQuote[];
  orderInstructions: { step1: string; step2: string; step3: string; step4: string; note: string };
}
interface PatentEntry { id: string; title: string; date: string; abstract: string; url: string; }
interface PatentResult {
  success: boolean; riskLevel: string; riskScore: number; riskNotes: string[];
  recommendation: string; patents: PatentEntry[]; disclaimer: string;
}
interface FullAnalysis {
  material: string; process: string; orientation: string;
  wallCheck: { pass: boolean; min: number; actual: number };
  printTime: string; costRange: string; score: number;
  warnings: string[]; recommendations: string[];
  estimatedVolumeCm3?: number; estimatedMassG?: number;
  materialProps?: { pros: string[]; cons: string[] };
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const c = score >= 7 ? "bg-emerald-400" : score >= 5 ? "bg-yellow-400" : score >= 3 ? "bg-orange-400" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-cad-text-secondary">Manufacturability</span>
        <span className="text-sm font-mono font-bold text-cad-text">{score}/10</span>
      </div>
      <div className="h-2 bg-cad-input rounded-full overflow-hidden">
        <div className={"h-full rounded-full transition-all duration-500 " + c} style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-cad-text-muted">{label}</span>
      <span className="text-[11px] font-mono text-cad-text bg-cad-input px-2 py-0.5 rounded">{value}</span>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-5 h-5 border-2 border-cad-accent border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs text-cad-text-muted">{label}</p>
    </div>
  );
}

function ErrorBox({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <p className="text-xs text-red-400 text-center">{msg}</p>
      <button onClick={onRetry} className="px-3 py-1.5 text-[11px] font-mono rounded bg-cad-accent/20 border border-cad-accent/40 text-cad-accent hover:bg-cad-accent/30 transition-colors">
        Retry
      </button>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const s: Record<string, string> = {
    LOW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    HIGH: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <span className={"text-[10px] font-bold px-2 py-0.5 rounded border " + (s[level] || s.MEDIUM)}>{level} RISK</span>;
}

export default function ManufacturingPanel() {
  const analysis = useDesignStore((s) => s.manufacturingAnalysis) as FullAnalysis | null;
  const analyzing = useDesignStore((s) => s.analyzingManufacturing);
  const stlBase64 = useDesignStore((s) => s.stlBase64);
  const status = useDesignStore((s) => s.status);
  const downloadSTL = useDesignStore((s) => s.downloadSTL);
  const analyzeManufacturing = useDesignStore((s) => s.analyzeManufacturing);
  const cemParams = useDesignStore((s) => s.cemParams);
  const tpmsParams = useDesignStore((s) => s.tpmsParams);
  const mode = useDesignStore((s) => s.mode);
  const triangles = useDesignStore((s) => s.triangles);

  const [tab, setTab] = useState<"analysis" | "quotes" | "patents">("analysis");
  const [quotes, setQuotes] = useState<QuoteResult | null>(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [patents, setPatents] = useState<PatentResult | null>(null);
  const [loadingPatents, setLoadingPatents] = useState(false);
  const [patentsError, setPatentsError] = useState<string | null>(null);

  const getBB = (): number[] => cemParams?.envelope ? Array.from(cemParams.envelope) : Array.from(tpmsParams.boundingBox);
  const getMat = () => cemParams?.manufacturing?.material || "PA12";
  const getProc = () => cemParams?.manufacturing?.process || "SLS";

  const fetchQuotes = async () => {
    setLoadingQuotes(true); setQuotesError(null);
    try {
      const bb = getBB();
      const vol = (bb[0] * bb[1] * bb[2]) / 1000 * 0.3;
      const res = await fetch(`${API}/api/quote`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ process: getProc(), material: getMat(), boundingBox: bb, triangleCount: triangles || 100000, volumeCm3: Math.round(vol * 100) / 100 }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      setQuotes(await res.json() as QuoteResult);
    } catch (e) { setQuotesError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoadingQuotes(false); }
  };

  const fetchPatents = async () => {
    setLoadingPatents(true); setPatentsError(null);
    try {
      const geom = cemParams?.fill?.type || tpmsParams.surfaceType || "gyroid";
      const app = cemParams?.name || mode.toUpperCase() + " structure";
      const res = await fetch(`${API}/api/patents`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: [geom, "lattice", "additive manufacturing"], tpmsType: geom, application: app }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      setPatents(await res.json() as PatentResult);
    } catch (e) { setPatentsError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoadingPatents(false); }
  };

  const handleTab = (t: "analysis" | "quotes" | "patents") => {
    setTab(t);
    if (t === "quotes" && !quotes && !loadingQuotes) fetchQuotes();
    if (t === "patents" && !patents && !loadingPatents) fetchPatents();
  };

  if (!stlBase64 && status !== "generating") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 gap-3">
        <div className="w-10 h-10 rounded-lg bg-cad-surface flex items-center justify-center">
          <svg className="w-5 h-5 text-cad-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-xs text-cad-text-muted text-center">Generate a part to see manufacturing analysis, quotes &amp; patent search.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-cad-border text-[11px] font-mono shrink-0">
        {(["analysis", "quotes", "patents"] as const).map((t) => (
          <button key={t} onClick={() => handleTab(t)}
            className={"flex-1 px-2 py-2 uppercase tracking-widest transition-colors " + (tab === t ? "text-cad-accent border-b border-cad-accent" : "text-cad-text-muted hover:text-cad-text")}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {tab === "analysis" && (
          analyzing ? <Spinner label="Analyzing manufacturability..." /> :
          analysis ? (
            <>
              <ScoreBar score={analysis.score} />
              <div className="border-t border-cad-border pt-2">
                <Row label="Material" value={analysis.material} />
                <Row label="Process" value={analysis.process} />
                {analysis.estimatedVolumeCm3 != null && <Row label="Volume" value={analysis.estimatedVolumeCm3 + " cm³"} />}
                {analysis.estimatedMassG != null && <Row label="Mass" value={analysis.estimatedMassG + " g"} />}
                <Row label="Print Time" value={analysis.printTime} />
                <Row label="Est. Cost" value={analysis.costRange} />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[11px] text-cad-text-muted">Wall Check</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-cad-text-muted">{analysis.wallCheck.actual}mm / {analysis.wallCheck.min}mm min</span>
                    <span className={"text-[10px] font-bold px-1.5 py-0.5 rouded " + (analysis.wallCheck.pass ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                      {analysis.wallCheck.pass ? "PASS" : "FAIL"}
                    </span>
                  </div>
                </div>
              </div>
              {analysis.materialProps && (
                <div className="border-t border-cad-border pt-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted mb-1.5">Material</p>
                  {analysis.materialProps.pros.map((p, i) => (
                    <div key={"p" + i} className="flex gap-1.5 mb-1"><span className="text-emerald-400 text-[11px]">+</span><span className="text-[11px] text-emerald-400/80">{p}</span></div>
                  ))}
                  {analysis.materialProps.cons.map((c, i) => (
                    <div key={"c" + i} className="flex gap-1.5 mb-1"><span className="text-yellow-400 text-[11px]">–</span><span className="text-[11px] text-yellow-400/80">{c}</span></div>
                  ))}
                </div>
              )}
              {analysis.warnings.length > 0 && (
                <div className="border-t border-cad-border pt-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-red-400 mb-1.5">Warnings</p>
                  {analysis.warnings.map((w, i) => (
                    <div key={i} className="flex gap-1.5 mb-1"><span className="text-red-400 text-[11px]">!</span><span className="text-[11px] text-red-400/80">{w}</span></div>
                  ))}
                </div>
              )}
              {analysis.recommendations.length > 0 && (
                <div className="border-t border-cad-border pt-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted mb-1.5">Recommendations</p>
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} className="flex gap-1.5 mb-1"><span className="text-cad-accent text-[11px]">›</span><span className="text-[11px] text-cad-text-muted">{r}</span></div>
                  ))}
                </div>
              )}
              <button onClick={() => analyzeManufacturing()} className="w-full mt-2 py-1.5 text-[10px] font-mono rounded bg-cad-surface border border-cad-border text-cad-text-muted hover:text-cad-text transition-colors">
                ↻ Re-analyze
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-xs text-cad-text-muted">Analysis not available yet.</p>
              <button onClick={() => analyzeManufacturing()} className="px-3 py-1.5 text-[11px] font-mono rounded bg-cad-accent/20 border border-cad-accent/40 text-cad-accent hover:bg-cad-accent/30 transition-colors">
                Run Analysis
              </button>
            </div>
          )
        )}

        {tab === "quotes" && (
          loadingQuotes ? <Spinner label="Getting quotes from bureaus..." /> :
          quotesError ? <ErrorBox msg={quotesError} onRetry={fetchQuotes} /> :
          quotes ? (
            <>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 bg-cad-input rounded p-2 text-center">
                  <div className="text-[10px] text-cad-text-muted">Volume</div>
                  <div className="text-xs font-mono text-cad-text">{quotes.partVolumeCm3} cm³</div>
                </div>
                <div className="flex-1 bg-cad-input rounded p-2 text-center">
                  <div className="text-[10px] text-cad-text-muted">Mass</div>
                  <div className="text-xs font-mono text-cad-text">{quotes.estimatedMassG} g</div>
                </div>
              </div>
              {stlBase64 && (
                <button onClick={downloadSTL} className="w-full py-2 rounded text-[11px] font-bold bg-cad-accent/20 border border-cad-accent/40 text-cad-accent hover:bg-cad-accent/30 transition-colors mb-2">
                  ↓ Download STL fir                </button>
              )}
              <p className="text-[10px] text-cad-text-muted mb-2">Upload STL to any bureau:</p>
              {quotes.quotes.map((q, i) => (
                <a key={i} href={q.url} target="_blank" rel="noreferrer"
                  className={"block p-3 rounded border transition-colors mb-2 no-underline " + (i === 0 ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-cad-border bg-cad-input/50 hover:border-cad-accent/40")}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px]">{q.badge}</span>
                      <span className="text-[12px] font-bold text-cad-text">{q.bureau}</span>
                      {i === 0 && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded">BEST</span>}
                    </div>
                    <span className="text-[13px] font-mono font-bold text-cad-text">${q.totalPriceUsd}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-cad-text-muted">
                    <span>${q.unitPriceUsd}/unit</span>
                    <span>{q.leadTimeDays}d lead</span>
                  </div>
                </a>
              ))}
              <p className="text-[9px] text-cad-text-muted mt-2 italic">{quotes.orderInstructions.note}</p>
            </>
          ) : <Spinner label="Loading quotes..." />
        )}

        {tab === "patents" && (
          loadingPatents ? <Spinner label="Searching USPTO..." /> :
          patentsError ? <ErrorBox msg={patentsError} onRetry={fetchPatents} /> :
          patents ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-cad-text-muted">IP Risk Assessment</span>
                <RiskBadge level={patents.riskLevel} />
              </div>
              <div className="h-1.5 bg-cad-input rounded-full overflow-hidden mb-3">
                <div className={"h-full rounded-full " + (patents.riskScore >= 7 ? "bg-red-500" : patents.riskScore >= 4 ? "bg-yellow-400" : "bg-emerald-400")}
                  style={{ width: (patents.riskScore / 10 * 100) + "%" }} />
              </div>
              {patents.riskNotes.map((n, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5">
                  <span className="text-[11px] text-yellow-400 shrink-0">›</span>
                  <span className="text-[11px] text-cad-text-muted">{n}</span>
                </div>
              ))}
              <div className="bg-cad-input/50 rounded p-2.5 mb-3 border border-cad-border">
                <p className="text-[11px] text-cad-text leading-relaxed">{patents.recommendation}</p>
              </div>
              {patents.patents.length > 0 && (
                <div className="border-t border-cad-border pt-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest textad-text-muted mb-2">Related Patents ({patents.patents.length})</p>
                  {patents.patents.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noreferrer" className="block mb-2.5 no-underline hover:opacity-80">
                      <div className="text-[11px] font-bold text-cad-accent">{p.title}</div>
                      <div className="text-[10px] text-cad-text-muted font-mono">US {p.id} · {p.date}</div>
                      <div className="text-[10px] text-cad-text-muted mt-0.5 leading-relaxed line-clamp-2">{p.abstract}</div>
                    </a>
                  ))}
                </div>
              )}
              <p className="text-[9px] text-cad-text-muted mt-2 italic">{patents.disclaimer}</p>
            </>
          ) : <Spinner label="Loading..." />
        )}
      </div>
    </div>
  );
}
