// Server-only proxy for Grok (xAI) — keeps GROK_API_KEY out of the client bundle.
// Called from lib/gemini.ts only when Gemini reports a rate limit / quota error.
import { NextResponse } from 'next/server';

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-4-fast';
const GROK_API_BASE = 'https://api.x.ai/v1/chat/completions';

interface GrokChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message: string };
}

export async function POST(request: Request) {
  if (!GROK_API_KEY) {
    return NextResponse.json({ error: 'NO_GROK_KEY' }, { status: 500 });
  }

  const { messages, maxTokens, expectJson } = (await request.json()) as {
    messages: GrokChatMessage[];
    maxTokens?: number;
    expectJson?: boolean;
  };

  const response = await fetch(GROK_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages,
      temperature: 0.85,
      max_tokens: maxTokens ?? 800,
      ...(expectJson ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return NextResponse.json({ error: `GROK_API_ERROR ${response.status}: ${body.slice(0, 200)}` }, { status: 502 });
  }

  const data: GrokResponse = await response.json();
  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 502 });
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    return NextResponse.json({ error: 'GROK_EMPTY_RESPONSE' }, { status: 502 });
  }

  return NextResponse.json({ text });
}
