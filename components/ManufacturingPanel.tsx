"use client";

import { useState } from "react";
import { useDesignStore } from "@/store/designStore";
import { getPrintQuotes } from "@/lib/api";
import type { PrintQuote, QuoteResult } from "@/lib/api";

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  let color = "bg-red-500";
  if (score >= 7) color = "bg-emerald-400";
  else if (score >= 5) color = "bg-yellow-400";
  else if (score >= 3) color = "bg-orange-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-cad-text-secondary">Manufacturability</span>
        <span className="text-sm font-mono font-bold text-cad-text">{score}/10</span>
      </div>
      <div className="h-2 bg-cad-input rounded-full overflow-hidden">
        <div className={"h-full rounded-full transition-all duration-500 " + color} style={{ width: pct + "%" }} />
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

function WallCheck({ pass, min, actual }: { pass: boolean; min: number; actual: number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-cad-text-muted">Wall Check</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-cad-text-muted">{actual}mm / {min}mm min</span>
        <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded " + (pass ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
          {pass ? "PASS" : "FAIL"}
        </span>
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    LOW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    HIGH: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={"text-[10px] font-bold px-2 py-0.5 rounded border " + (styles[level] || styles.MEDIUM)}>
      {level} RISK
    </span>
  );
}

export default function ManufacturingPanel() {
  const analysis = useDesignStore((s) => s.manufacturingAnalysis);
  const analyzing = useDesignStore((s) => s.analyzingManufacturing);
  const status = useDesignStore((s) => s.status);
  const stlBase64 = useDesignStore((s) => s.stlBase64);
  const downloadSTL = useDesignStore((s) => s.downloadSTL);

  const [tab, setTab] = useState<"analysis" | "quotes" | "patents">("analysis");
  const [quotes, setQuotes] = useState<QuoteResult | null>(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [patents, setPatents] = useState<null | {
    riskLevel: string; riskScore: number; riskNotes: string[];
    recommendation: string; patents: { id: string; title: string; date: string; abstract: string; url: string }[];
    disclaimer: string;
  }>(null);
  const [loadingPatents, setLoadingPatents] = useState(false);

  const cemParams = useDesignStore((s) => s.cemParams);
  const tpmsParams = useDesignStore((s) => s.tpmsParams);
  const mode = useDesignStore((s) => s.mode);

  const fetchQuotes = async () => {
    setLoadingQuotes(true);
    try {
      const mat = cemParams?.manufacturing?.material || "PA12";
      const proc = cemParams?.manufacturing?.process || "SLS";
      const env = cemParams?.envelope || tpmsParams.boundingBox;
      const result = await getPrintQuotes({
        material: mat, process: proc,
        envelope: Array.from(env),
        fillRatio: 0.3, shellThickness: cemParams?.shellThickness || 1.0,
        quantity: 1,
      });
      setQuotes(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const fetchPatents = async () => {
    setLoadingPatents(true);
    try {
      const geom = cemParams?.fill?.type || tpmsParams.surfaceType;
      const app = cemParams?.name || "";
      const res = await fetch("https://lattiformapi.onrender.com/api/patents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geometryType: geom, application: app }),
      });
      const data = await res.json();
      setPatents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPatents(false);
    }
  };

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-5 h-5 border-2 border-cad-accent border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-cad-text-muted">Analyzing manufacturability...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 gap-3">
        <p className="text-xs text-cad-text-muted text-center">
          {status === "success" ? "Analysis will appear here after generation." : "Generate a part to see analysis."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-cad-border text-[11px] font-mono shrink-0">
        {(["analysis", "quotes", "patents"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === "quotes" && !quotes) fetchQuotes(); if (t === "patents" && !patents) fetchPatents(); }}
            className={"px-3 py-2 uppercase tracking-widest transition-colors " + (tab === t ? "text-cad-accent border-b border-cad-accent" : "text-cad-text-muted hover:text-cad-text")}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ── ANALYSIS TAB ── */}
        {tab === "analysis" && (
          <>
            <ScoreBar score={analysis.score} />
            <div className="border-t border-cad-border pt-2">
              <Row label="Material" value={analysis.material} />
              <Row label="Process" value={analysis.process} />
              <Row label="Volume" value={(analysis as unknown as { estimatedVolumeCm3?: number }).estimatedVolumeCm3 ? `${(analysis as unknown as { estimatedVolumeCm3: number }).estimatedVolumeCm3}cm³` : "—"} />
              <Row label="Mass" value={(analysis as unknown as { estimatedMassG?: number }).estimatedMassG ? `${(analysis as unknown as { estimatedMassG: number }).estimatedMassG}g` : "—"} />
              <Row label="Print Time" value={analysis.printTime} />
              <Row label="Est. Cost" value={analysis.costRange} />
              <WallCheck pass={analysis.wallCheck.pass} min={analysis.wallCheck.min} actual={analysis.wallCheck.actual} />
            </div>

            {(analysis as unknown as { materialProps?: { pros: string[]; cons: string[] } }).materialProps && (
              <div className="border-t border-cad-border pt-2">
                <p className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted mb-1.5">Material Props</p>
                {((analysis as unknown as { materialProps: { pros: string[] } }).materialProps.pros || []).map((p, i) => (
                  <div key={i} className="flex gap-1.5 mb-1"><span className="text-emerald-400 text-[11px]">+</span><span className="text-[11px] text-emerald-400/80">{p}</span></div>
                ))}
                {((analysis as unknown as { materialProps: { cons: string[] } }).materialProps.cons || []).map((c, i) => (
                  <div key={i} className="flex gap-1.5 mb-1"><span className="text-yellow-400 text-[11px]">–</span><span className="text-[11px] text-yellow-400/80">{c}</span></div>
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
                <p className="text-[10px] font-mono uppercase tracking-widest text-yellow-400 mb-1.5">Recommendations</p>
                {analysis.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-1.5 mb-1"><span className="text-yellow-400 text-[11px]">›</span><span className="text-[11px] text-yellow-400/80">{r}</span></div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── QUOTES TAB ── */}
        {tab === "quotes" && (
          <>
            {loadingQuotes ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-cad-accent border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-xs text-cad-text-muted">Getting quotes...</span>
              </div>
            ) : quotes ? (
              <>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 bg-cad-input rounded p-2 text-center">
                    <div className="text-[10px] text-cad-text-muted">Volume</div>
                    <div className="text-xs font-mono text-cad-text">{quotes.partVolumeCm3}cm³</div>
                  </div>
                  <div className="flex-1 bg-cad-input rounded p-2 text-center">
                    <div className="text-[10px] text-cad-text-muted">Mass</div>
                    <div className="text-xs font-mono text-cad-text">{quotes.estimatedMassG}g</div>
                  </div>
                </div>

                {/* Download first */}
                {stlBase64 && (
                  <button onClick={downloadSTL}
                    className="w-full py-2 rounded text-[11px] font-bold bg-cad-accent/20 border border-cad-accent/40 text-cad-accent hover:bg-cad-accent/30 transition-colors mb-2">
                    ↓ Download STL (step 1)
                  </button>
                )}

                <p className="text-[10px] text-cad-text-muted mb-2">Upload the STL to any of these bureaus:</p>

                {quotes.quotes.map((q, i) => (
                  <a key={i} href={q.url} target="_blank" rel="noreferrer"
                    className={"block p-3 rounded border transition-colors mb-2 no-underline " + (i === 0 ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-cad-border bg-cad-input/50 hover:border-cad-accent/40")}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">{q.badge}</span>
                        <span className="text-[12px] font-bold text-cad-text">{q.bureau}</span>
                        {i === 0 && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded">CHEAPEST</span>}
                      </div>
                      <span className="text-[13px] font-mono font-bold text-cad-text">${q.totalPriceUsd}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-cad-text-muted">
                      <span>${q.unitPriceUsd}/unit</span>
                      <span>{q.leadTimeDays} days lead time</span>
                    </div>
                  </a>
                ))}

                <p className="text-[9px] text-cad-text-muted mt-2 italic">{quotes.orderInstructions.note}</p>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-cad-text-muted">Loading quotes...</p>
              </div>
            )}
          </>
        )}

        {/* ── PATENTS TAB ── */}
        {tab === "patents" && (
          <>
            {loadingPatents ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-cad-accent border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-xs text-cad-text-muted">Searching USPTO...</span>
              </div>
            ) : patents ? (
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
                    <p className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted mb-2">Related Patents</p>
                    {patents.patents.map((p, i) => (
                      <a key={i} href={p.url} target="_blank" rel="noreferrer"
                        className="block mb-2.5 no-underline hover:opacity-80">
                        <div className="text-[11px] font-bold text-cad-accent">{p.title}</div>
                        <div className="text-[10px] text-cad-text-muted font-mono">US {p.id} · {p.date}</div>
                        <div className="text-[10px] text-cad-text-muted mt-0.5 leading-relaxed">{p.abstract}</div>
                      </a>
                    ))}
                  </div>
                )}

                <p className="text-[9px] text-cad-text-muted mt-2 italic">{patents.disclaimer}</p>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-cad-text-muted">Loading patent data...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
