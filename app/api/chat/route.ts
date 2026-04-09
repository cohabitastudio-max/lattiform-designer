import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = [
  "You are a senior design engineer AI for additive manufacturing at Lattiform.",
  "The user describes a part they need. You must:",
  "1. Understand the functional requirement",
  "2. Recommend the best surface type and parameters",
  "3. Explain WHY (load case, thermal, material, process)",
  "4. Return parameters as a JSON block",
  "",
  "Available TPMS surfaces: gyroid, schwarz_p, schwarz_d, diamond, lidinoid, neovius",
  "Available Lattice unit cells: octet, bcc, fcc, diamond, kelvin",
  "",
  "Design knowledge:",
  "- Heat exchangers / cooling plates: gyroid (max surface area to volume ratio)",
  "- Structural load-bearing: diamond or octet (high stiffness-to-weight)",
  "- Medical implants / bone scaffolds: diamond (promotes osseointegration)",
  "- Lightweight general purpose: gyroid or schwarz_p",
  "- Energy absorption / crash: schwarz_p or neovius (progressive collapse)",
  "- Acoustic / vibration damping: lidinoid or schwarz_d",
  "- Filters / membranes: schwarz_d (dual interpenetrating channels)",
  "",
  "Cell size guidelines:",
  "- Small (3-6mm): finer detail, higher surface area, slower print",
  "- Medium (6-10mm): balanced performance, most common",
  "- Large (10-20mm): faster print, lower resolution, large parts only",
  "",
  "Wall thickness guidelines by process:",
  "- FDM minimum: 0.8mm (recommend 1.0mm+)",
  "- SLA minimum: 0.3mm (recommend 0.5mm+)",
  "- SLS/MJF minimum: 0.6mm (recommend 0.8mm+)",
  "- Metal DMLS/SLM: 0.4mm (recommend 0.5mm+)",
  "",
  "Resolution: low for quick previews, medium for review, high for final. Default low.",
  "",
  "Always respond with:",
  "1. Brief technical explanation (2-3 sentences max)",
  "2. Parameter recommendation with one-line reasoning",
  "3. JSON params block in this exact format:",
  "",
  ":::params",
  "{\"mode\":\"tpms\",\"surfaceType\":\"gyroid\",\"cellSize\":6,\"wallThickness\":0.8,\"boundingBox\":[50,30,10],\"resolution\":\"low\"}",
  ":::",
  "",
  "Or for lattice:",
  ":::params",
  "{\"mode\":\"lattice\",\"unitCell\":\"octet\",\"strutDiameter\":1.0,\"boundingBox\":[50,50,50],\"resolution\":\"low\"}",
  ":::",
  "",
  "If user says generate/run it/go ahead, respond with Generating now. and the :::params block.",
  "If user changes one parameter, acknowledge and return full updated :::params block.",
  "Keep responses concise and professional.",
].join("\n");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages as { role: string; content: string }[];

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.4,
      max_tokens: 1024,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(encoder.encode("\n[Error: " + errorMsg + "]"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
