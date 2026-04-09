import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = [
  "You are a manufacturing engineer specializing in additive manufacturing.",
  "You receive part generation parameters and mesh statistics.",
  "Analyze manufacturability and return ONLY a JSON block, no other text.",
  "",
  "Return this exact format:",
  ":::analysis",
  "{",
  '  "material": "recommended material e.g. AlSi10Mg, PA12, Ti6Al4V",',
  '  "process": "recommended AM process e.g. SLM, SLS, FDM, SLA, MJF, BJ",',
  '  "orientation": "recommended build orientation e.g. Z-up, X-up",',
  '  "wallCheck": { "pass": true/false, "min": minimum_for_process, "actual": wall_thickness },',
  '  "printTime": "estimated print time range e.g. 2-3h",',
  '  "costRange": "estimated cost range e.g. \$15-\$45",',
  '  "score": 1-10 manufacturability score,',
  '  "warnings": ["array of warnings if any"],',
  '  "recommendations": ["array of improvement suggestions"]',
  "}",
  ":::",
  "",
  "Scoring guide:",
  "9-10: Production ready, no issues",
  "7-8: Good, minor optimizations possible",
  "5-6: Acceptable, some concerns",
  "3-4: Difficult, significant redesign suggested",
  "1-2: Not manufacturable as designed",
  "",
  "Consider: wall thickness vs process limits, overhang angles, part size vs build volume,",
  "triangle count vs mesh quality, surface type suitability for application.",
  "",
  "Cost estimation factors:",
  "- Metal SLM/DMLS: \$0.10-0.30 per gram + \$50-150 setup",
  "- Polymer SLS/MJF: \$0.05-0.15 per cm3 + \$20-50 setup",
  "- FDM: \$0.02-0.08 per cm3 + \$5-15 setup",
  "- SLA: \$0.05-0.20 per cm3 + \$10-30 setup",
  "",
  "Return ONLY the :::analysis JSON block. Nothing else.",
].join("\n");

interface AnalyzeRequest {
  mode: string;
  params: Record<string, unknown>;
  triangles: number;
  fileSize: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeRequest;

    if (!body.mode || !body.params || !body.triangles) {
      return new Response(
        JSON.stringify({ error: "mode, params, and triangles required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const userContent = [
      "Analyze this generated part:",
      "",
      "Mode: " + body.mode.toUpperCase(),
      "Parameters: " + JSON.stringify(body.params, null, 2),
      "Mesh triangles: " + body.triangles.toLocaleString(),
      "File size: " + ((body.fileSize || 0) / 1024 / 1024).toFixed(1) + " MB",
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const text = completion.choices[0]?.message?.content || "";
    const match = text.match(/:::analysis\s*([\s\S]*?)\s*:::/);

    if (!match) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify({ analysis }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: "Could not parse analysis response" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const analysis = JSON.parse(match[1].trim());
    return new Response(JSON.stringify({ analysis }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
