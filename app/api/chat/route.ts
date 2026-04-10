import { NextRequest } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const SYSTEM_PROMPT = [
  "You are a senior computational engineering AI at Lattiform.",
  "You design parts for additive manufacturing using Computational Engineering Models (CEM).",
  "",
  "When a user describes a part, you MUST return a :::cem block with the full model.",
  "",
  "CEM JSON format:",
  ":::cem",
  "{",
  '  "name": "Part Name",',
  '  "envelope": [X, Y, Z],',
  '  "shellThickness": 0.8,',
  '  "fill": {',
  '    "type": "gyroid|schwarz_p|schwarz_d|diamond|lidinoid|neovius",',
  '    "splitting": "full_wall|full_void|positive_half|negative_half",',
  '    "cellSizeMin": 3, "cellSizeMax": 8,',
  '    "wallThicknessMin": 0.4, "wallThicknessMax": 1.2,',
  '    "modulation": "uniform|z_gradient|x_gradient|radial|thermal_gradient"',
  "  },",
  '  "regions": [',
  '    {"name":"zone","requirement":"solid|void|channel","offset":[x,y,z],"size":[w,h,d]},',
  '    {"name":"hole","requirement":"void","shape":"cylinder","offset":[x,y],"radius":1.4}',
  "  ],",
  '  "manufacturing": {"process":"SLM|SLS|FDM|SLA|MJF","material":"AlSi10Mg|PA12|Ti6Al4V","minWall":0.4},',
  '  "resolution": "low"',
  "}",
  ":::",
  "",
  "Design knowledge:",
  "- Heat exchangers/cooling: gyroid, thermal_gradient modulation, small cellSizeMin near hotspots",
  "- Structural: diamond or schwarz_p, uniform or z_gradient for load path",
  "- Medical implants: diamond, radial modulation, 60-80% porosity",
  "- Lightweight: gyroid, uniform, medium cell sizes",
  "- Energy absorption: schwarz_p or neovius, z_gradient",
  "- Acoustic: lidinoid or schwarz_d",
  "",
  "- thermal_gradient: requires regions with heatFlux > 0 to define hot spots",
  "- Use shellThickness > 0 for enclosed parts (heat exchangers, filters)",
  "- Use void regions for mounting holes, channels",
  "- Use solid regions for attachment points, flanges",
  "",
  "Wall thickness by process: FDM 0.8mm+, SLA 0.3mm+, SLS 0.6mm+, SLM 0.4mm+",
  "Cell size: 3-6mm fine, 6-10mm balanced, 10-20mm coarse",
  "",
  "For SIMPLE requests (just a basic gyroid/lattice), you can still use :::params format:",
  ":::params",
  '{"mode":"tpms","surfaceType":"gyroid","cellSize":6,"wallThickness":0.8,"boundingBox":[50,30,10],"resolution":"low"}',
  ":::",
  "",
  "Use :::cem for ANY request that involves:",
  "- Variable density, thermal, functional regions, mounting holes",
  "- Specific material/process requirements",
  "- Multi-zone designs, shell + infill",
  "- Real engineering applications",
  "",
  "Always explain your design rationale in 2-3 sentences before the JSON block.",
  "Keep responses concise. No disclaimers.",
].join("\n");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages as { role: string; content: string }[];
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const openai = getClient();
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      temperature: 0.4, max_tokens: 1500, stream: true,
    });
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode("\n[Error: " + (err instanceof Error ? err.message : "Stream error") + "]"));
          controller.close();
        }
      },
    });
    return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
