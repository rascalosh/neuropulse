// Server-only proxy for Gemini — keeps GEMINI_API_KEY out of the client bundle.
// Called from lib/gemini.ts and lib/omnifocus.ts instead of hitting
// generativelanguage.googleapis.com directly from the browser.
import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const API_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role?: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message: string };
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'NO_GEMINI_KEY — isi GEMINI_API_KEY di apps/web/.env lalu restart dev server' },
      { status: 500 }
    );
  }

  const { systemInstruction, contents, generationConfig } = (await request.json()) as {
    systemInstruction?: string;
    contents: GeminiContent[];
    generationConfig?: Record<string, unknown>;
  };

  const response = await fetch(`${API_BASE}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
      contents,
      generationConfig: { temperature: 0.8, maxOutputTokens: 1024, topP: 0.9, ...generationConfig },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return NextResponse.json({ error: `API_ERROR ${response.status}: ${body.slice(0, 200)}` }, { status: 502 });
  }

  const data: GeminiResponse = await response.json();
  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 502 });
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return NextResponse.json({ error: 'EMPTY_RESPONSE' }, { status: 502 });
  }

  return NextResponse.json({ text });
}
