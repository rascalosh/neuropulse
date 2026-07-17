// lib/omnifocus.ts — Utilities for OmniFocusReader

// ─── Bionic Reading ──────────────────────────────────────────────────────────
// Bold the first ~40-60% of characters in each word to anchor the eye.

function bionicWord(word: string): string {
  if (word.length <= 1) return `<b>${word}</b>`;
  if (word.length <= 3) return `<b>${word[0]}</b>${word.slice(1)}`;
  const boldLen = Math.ceil(word.length * 0.45);
  return `<b>${word.slice(0, boldLen)}</b>${word.slice(boldLen)}`;
}

/**
 * Convert plain text to Bionic Reading HTML.
 * Preserves line breaks and skips punctuation-only tokens.
 */
export function toBionicHtml(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      line
        .split(/(\s+)/)
        .map((token) => {
          if (/^\s+$/.test(token)) return token;
          // Separate leading/trailing punctuation from the word
          const match = token.match(/^([^a-zA-Z0-9À-ÿ]*)([a-zA-Z0-9À-ÿ'-]+)([^a-zA-Z0-9À-ÿ]*)$/);
          if (!match) return token;
          const [, pre, word, post] = match as [string, string, string, string];
          return `${pre}${bionicWord(word)}${post}`;
        })
        .join('')
    )
    .join('<br/>');
}

// ─── PDF text extraction ─────────────────────────────────────────────────────
// Uses pdfjs-dist to extract real text from PDF pages, client-side only.

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('extractTextFromPdf can only run in the browser');
  }

  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) pageTexts.push(text);
  }

  const fullText = pageTexts.join('\n\n').trim();
  return fullText || '[PDF tidak berisi teks yang bisa diekstrak — mungkin ini hasil scan/gambar.]';
}

// ─── Image OCR stub ──────────────────────────────────────────────────────────
// In production, send the image to Gemini Vision or Tesseract.js

export async function extractTextFromImage(
  base64DataUrl: string
): Promise<string> {
  // The OmniFocusReader sends images directly to Gemini for analysis.
  // This stub returns the data URL for the component to use.
  return base64DataUrl;
}

// ─── Gemini Summarization ────────────────────────────────────────────────────

// Calls Gemini through our own /api/gemini route instead of Google directly —
// GEMINI_API_KEY lives server-side only and is never sent to the browser.
async function callGemini(
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  maxTokens = 1024
): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens, topP: 0.9 },
    }),
  });
  const data: { text?: string; error?: string } = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? `API_ERROR ${res.status}`);
  const text = data.text;
  if (!text) throw new Error('EMPTY_RESPONSE');
  return text.trim();
}

export interface SummaryPoint {
  emoji: string;
  text: string;
}

/**
 * Clean up messy text (e.g. from PDF extraction or copy-pasting tables)
 * so it flows naturally and is easy to read.
 */
export async function cleanTextWithGemini(text: string): Promise<string> {
  const prompt = `Rapikan teks berikut agar sangat mudah dibaca. Teks ini mungkin hasil ekstraksi dari PDF atau copy-paste yang berantakan (misalnya tabel yang hancur, baris terputus, dsb).
Aturan:
1. Perbaiki paragraf, spasi, dan tanda baca.
2. Jika ada tabel yang hancur, ubah menjadi format daftar (bullet points) yang rapi.
3. Hapus header/footer/nomor halaman yang mengganggu.
4. JANGAN merangkum isi teks, pertahankan informasi aslinya secara utuh, hanya perbaiki formatnya.

Teks:
"""
${text.slice(0, 12000)}
"""`;

  try {
    const raw = await callGemini([{ text: prompt }], 2048);
    return raw;
  } catch (err) {
    console.warn('[OmniFocusReader] cleanTextWithGemini failed:', err);
    return text;
  }
}

/**
 * Summarize text into 3-5 bite-sized bullet points for ADHD users.
 */
export async function summarizeForADHD(text: string): Promise<SummaryPoint[]> {
  const prompt = `Kamu adalah asisten ADHD yang membantu menyederhanakan teks panjang menjadi poin-poin singkat.

Berikut teksnya:
"""
${text.slice(0, 6000)}
"""

Buat 3–5 poin utama yang:
- Masing-masing maksimal 1–2 kalimat
- Langsung ke intinya, tidak bertele-tele
- Ditulis dalam bahasa Indonesia santai dan jelas
- Setiap poin diawali dengan 1 emoji relevan
- Format: satu poin per baris, diawali emoji lalu spasi lalu teks

Respond ONLY dengan daftar poin tersebut, tanpa penjelasan tambahan.`;

  try {
    const raw = await callGemini([{ text: prompt }], 512);
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return lines.map((line) => {
      // Extract leading emoji
      const emojiMatch = line.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
      if (emojiMatch) {
        return { emoji: emojiMatch[0].trim(), text: line.slice(emojiMatch[0].length).trim() };
      }
      return { emoji: '💡', text: line.replace(/^[-•*]\s*/, '').trim() };
    });
  } catch {
    // Mock fallback
    return [
      { emoji: '📌', text: 'Teks berhasil dimuat. Klik Rangkum untuk mendapatkan ringkasan otomatis.' },
      { emoji: '💡', text: 'Sambungkan API Gemini di .env untuk ringkasan menggunakan AI.' },
      { emoji: '🔍', text: 'Bionic Reading sudah aktif — huruf tebal membantu mata tetap fokus pada kata.' },
    ];
  }
}

/**
 * Analyze an image with Gemini Vision and return a description.
 */
export async function analyzeImageWithGemini(base64DataUrl: string): Promise<string> {
  // Extract mime type and base64 data
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  const [, mimeType, data] = match;

  const prompt = 'Deskripsikan konten gambar ini dalam bahasa Indonesia dengan jelas dan ringkas. Jika ada teks di gambar, tuliskan teksnya lengkap.';

  try {
    return await callGemini(
      [
        { text: prompt },
        { inlineData: { mimeType: mimeType as string, data: data as string } },
      ],
      1024
    );
  } catch {
    return '[Analisis gambar gagal — pastikan API key valid dan gambar berformat JPG/PNG/WEBP]';
  }
}

// ─── Text-to-Video handler ───────────────────────────────────────────────────
// Prototype: simulates generation and hands back a playable demo clip so the
// "Ubah ke Video" flow has something to actually show. Swap the body for a
// real API call (Runway ML, Kling, Sora, etc.) when one is wired up.

export interface TextToVideoOptions {
  text: string;
  style?: 'educational' | 'cinematic' | 'whiteboard' | 'broadcast';
  durationSeconds?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface TextToVideoResult {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  estimatedSeconds?: number;
}

const PROTOTYPE_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

/**
 * Trigger text-to-video generation.
 * Replace the stub body with your actual API call (Runway ML, Kling API, etc.)
 */
export async function triggerTextToVideo(
  options: TextToVideoOptions
): Promise<TextToVideoResult> {
  // TODO: Replace with real API call, e.g.:
  //
  // const res = await fetch('https://api.runwayml.com/v1/generate', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_RUNWAY_API_KEY}` },
  //   body: JSON.stringify({ prompt: options.text, duration: options.durationSeconds ?? 10 }),
  // });
  // const data = await res.json();
  // return { jobId: data.id, status: 'queued', estimatedSeconds: 60 };

  console.log('[OmniFocusReader] Text-to-Video (prototype) triggered:', options);

  // Simulates a generation job that completes with a playable clip
  await new Promise((r) => setTimeout(r, 1400));
  return {
    jobId: `job_${Date.now()}`,
    status: 'completed',
    videoUrl: PROTOTYPE_VIDEO_URL,
    estimatedSeconds: 0,
  };
}
