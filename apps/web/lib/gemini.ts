// lib/gemini.ts — Gemini API wrapper with offline fallback
import type { QuestionnaireAnswers } from './storage';

type Lang = 'id' | 'en';

// Both Gemini and its Grok backup are called through our own /api/* routes —
// GEMINI_API_KEY and GROK_API_KEY live server-side only (app/api/gemini and
// app/api/grok) and never reach the browser bundle.

// Detects Gemini rate-limit / quota errors (HTTP 429, or Gemini's
// RESOURCE_EXHAUSTED status) so we know when to switch to the Grok backup
// instead of falling straight through to the offline mock response.
function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b/.test(msg) || /RESOURCE_EXHAUSTED/i.test(msg) || /rate.?limit/i.test(msg) || /quota/i.test(msg);
}

// Small/lite Gemini models occasionally leak stray CJK tokens into otherwise
// Indonesian/English output (a known decoding artifact, more common at
// higher temperature). Strip them out as a safety net after the model has
// already been instructed not to produce them.
// Ranges: CJK punctuation, Hiragana/Katakana, CJK Ext-A, CJK Unified
// Ideographs (Han/Mandarin), Hangul syllables, CJK compatibility, fullwidth forms.
// eslint-disable-next-line no-irregular-whitespace -- range intentionally starts at U+3000 (ideographic space)
const CJK_RANGE = /[　-〿぀-ヿ㐀-䶿一-鿿가-힣豈-﫿＀-￯]/g;

function stripStrayCJK(text: string): string {
  if (!CJK_RANGE.test(text)) return text;
  CJK_RANGE.lastIndex = 0;
  return text.replace(CJK_RANGE, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

const SYSTEM_INSTRUCTION: Record<Lang, string> = {
  id:
    'Kamu HANYA boleh merespon dalam Bahasa Indonesia (atau Inggris jika diminta eksplisit). ' +
    'JANGAN PERNAH menghasilkan karakter Mandarin/China, Jepang, Korea, atau aksara non-Latin lainnya, ' +
    'bahkan sebagai typo atau campuran sebagian kata. Jika ragu, gunakan Bahasa Indonesia biasa.',
  en:
    'You MUST respond ONLY in English. ' +
    'NEVER produce Mandarin/Chinese, Japanese, Korean, or other non-Latin script characters, ' +
    'even as a typo or partial word mix. If unsure, use plain English.',
};

// Calls Gemini through our own /api/gemini route instead of Google directly —
// GEMINI_API_KEY lives server-side only and is never sent to the browser.
async function callGeminiRaw(prompt: string, maxTokens = 1024, expectJson = false, lang: Lang = 'id'): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: SYSTEM_INSTRUCTION[lang],
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: maxTokens,
        topP: 0.9,
        ...(expectJson ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });

  const data: { text?: string; error?: string } = await response.json();
  if (!response.ok || data.error) throw new Error(data.error ?? `API_ERROR ${response.status}`);

  const text = data.text;
  if (!text) throw new Error('EMPTY_RESPONSE');

  const cleaned = stripStrayCJK(text.trim());
  // If most of the response turned out to be CJK garbage, treat it as a
  // failed generation so the caller falls back to the mock response
  // instead of returning a mangled/truncated result.
  if (!cleaned || cleaned.length < text.trim().length * 0.5) {
    throw new Error('FOREIGN_CHAR_LEAK');
  }

  return cleaned;
}

// Calls Grok through our own /api/grok route instead of xAI directly —
// GROK_API_KEY lives server-side only and is never sent to the browser.
async function callGrok(prompt: string, maxTokens = 1024, expectJson = false, lang: Lang = 'id'): Promise<string> {
  const response = await fetch('/api/grok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION[lang] },
        { role: 'user', content: prompt },
      ],
      maxTokens,
      expectJson,
    }),
  });

  const data: { text?: string; error?: string } = await response.json();
  if (!response.ok || data.error) throw new Error(data.error ?? `GROK_PROXY_ERROR ${response.status}`);

  const text = data.text;
  if (!text) throw new Error('GROK_EMPTY_RESPONSE');

  const cleaned = stripStrayCJK(text.trim());
  if (!cleaned || cleaned.length < text.trim().length * 0.5) {
    throw new Error('GROK_FOREIGN_CHAR_LEAK');
  }

  return cleaned;
}

// Public entry point — tries Gemini first, and transparently switches to
// Grok only when Gemini specifically reports a rate limit / quota error.
// Any other Gemini failure (bad key, empty response, etc.) propagates
// unchanged so the existing mock-fallback behavior in each feature function
// still applies.
async function callGemini(prompt: string, maxTokens = 1024, expectJson = false, lang: Lang = 'id'): Promise<string> {
  try {
    return await callGeminiRaw(prompt, maxTokens, expectJson, lang);
  } catch (err) {
    if (isRateLimitError(err)) {
      console.warn('[Gemini] rate limit tercapai — beralih ke Grok backup');
      try {
        return await callGrok(prompt, maxTokens, expectJson, lang);
      } catch (grokErr) {
        console.warn('[Grok] backup juga gagal —', grokErr);
        throw err;
      }
    }
    throw err;
  }
}

async function callGeminiWithHistoryRaw(
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  maxTokens = 800,
  lang: Lang = 'id'
): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: SYSTEM_INSTRUCTION[lang],
      contents: history,
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: maxTokens,
        topP: 0.9,
      },
    }),
  });

  const data: { text?: string; error?: string } = await response.json();
  if (!response.ok || data.error) throw new Error(data.error ?? `API_ERROR ${response.status}`);

  const text = data.text;
  if (!text) throw new Error('EMPTY_RESPONSE');

  return stripStrayCJK(text.trim());
}

async function callGrokWithHistory(
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  maxTokens = 800,
  lang: Lang = 'id'
): Promise<string> {
  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION[lang] },
    ...history.map((h) => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts.map((p) => p.text).join('\n'),
    })),
  ];

  const response = await fetch('/api/grok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, maxTokens }),
  });

  const data: { text?: string; error?: string } = await response.json();
  if (!response.ok || data.error) throw new Error(data.error ?? `GROK_PROXY_ERROR ${response.status}`);

  const text = data.text;
  if (!text) throw new Error('GROK_EMPTY_RESPONSE');

  return stripStrayCJK(text.trim());
}

async function callGeminiWithHistory(
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  maxTokens = 800,
  lang: Lang = 'id'
): Promise<string> {
  try {
    return await callGeminiWithHistoryRaw(history, maxTokens, lang);
  } catch (err) {
    if (isRateLimitError(err)) {
      console.warn('[Gemini] rate limit tercapai — beralih ke Grok backup');
      try {
        return await callGrokWithHistory(history, maxTokens, lang);
      } catch (grokErr) {
        console.warn('[Grok] backup juga gagal —', grokErr);
        throw err;
      }
    }
    throw err;
  }
}

function warnMockFallback(feature: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[Gemini] ${feature}: pakai mock fallback — ${msg}`);
}

// ============================================================
// MOCK FALLBACKS (used when no API key or rate limit hit)
// ============================================================

function mockDecompose(task: string, lang: Lang): string {
  if (lang === 'en') {
    return JSON.stringify({
      microTasks: [
        { title: `Open the document and read the brief for "${task.slice(0, 30)}..."`, estimatedMinutes: 5, group: 'Phase 1: Prep', parallel: false },
        { title: 'Write down the 3 main points to tackle', estimatedMinutes: 5, group: 'Phase 1: Prep', parallel: false },
        { title: 'Work on the first part (draft/outline)', estimatedMinutes: 10, group: 'Phase 2: Execution', parallel: false },
        { title: 'Work on the second part', estimatedMinutes: 10, group: 'Phase 2: Execution', parallel: true },
        { title: 'Review the result and fix anything needed', estimatedMinutes: 5, group: 'Phase 3: Wrap-up', parallel: false },
        { title: 'Finalize and save your progress', estimatedMinutes: 5, group: 'Phase 3: Wrap-up', parallel: false },
      ],
      groups: [
        { label: 'Phase 1: Prep', type: 'sequential' },
        { label: 'Phase 2: Execution', type: 'parallel' },
        { label: 'Phase 3: Wrap-up', type: 'sequential' },
      ],
    });
  }
  return JSON.stringify({
    microTasks: [
      { title: `Buka dokumen dan baca brief "${task.slice(0, 30)}..."`, estimatedMinutes: 5, group: 'Fase 1: Persiapan', parallel: false },
      { title: 'Catat 3 poin utama yang perlu dikerjakan', estimatedMinutes: 5, group: 'Fase 1: Persiapan', parallel: false },
      { title: 'Kerjakan bagian pertama (draft/outline)', estimatedMinutes: 10, group: 'Fase 2: Eksekusi', parallel: false },
      { title: 'Kerjakan bagian kedua', estimatedMinutes: 10, group: 'Fase 2: Eksekusi', parallel: true },
      { title: 'Review hasil dan perbaiki jika perlu', estimatedMinutes: 5, group: 'Fase 3: Finalisasi', parallel: false },
      { title: 'Finalisasi dan simpan progress', estimatedMinutes: 5, group: 'Fase 3: Finalisasi', parallel: false },
    ],
    groups: [
      { label: 'Fase 1: Persiapan', type: 'sequential' },
      { label: 'Fase 2: Eksekusi', type: 'parallel' },
      { label: 'Fase 3: Finalisasi', type: 'sequential' },
    ],
  });
}

function mockReframe(task: string, interest: string, lang: Lang): string {
  const mapsId: Record<string, string[]> = {
    anime: ['Quest', 'Arc', 'Skill', 'Boss battle', 'Power-up'],
    game: ['Mission', 'Level', 'Achievement', 'Checkpoint', 'Loot'],
    masak: ['Resep', 'Bahan', 'Langkah memasak', 'Plating', 'Hidangan'],
    musik: ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'],
    olahraga: ['Warm-up', 'Set', 'Rep', 'Sprint', 'Cool-down'],
  };
  const mapsEn: Record<string, string[]> = {
    anime: ['Quest', 'Arc', 'Skill', 'Boss battle', 'Power-up'],
    game: ['Mission', 'Level', 'Achievement', 'Checkpoint', 'Loot'],
    cooking: ['Recipe', 'Ingredients', 'Cooking step', 'Plating', 'Dish'],
    music: ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'],
    sports: ['Warm-up', 'Set', 'Rep', 'Sprint', 'Cool-down'],
  };
  if (lang === 'en') {
    const terms = mapsEn[interest.toLowerCase()] || ['Phase', 'Step', 'Part', 'Session', 'Wrap-up'];
    return `[${terms[0]}] Starting task "${task.slice(0, 25)}..." — you're one step closer! 💪`;
  }
  const terms = mapsId[interest.toLowerCase()] || ['Fase', 'Langkah', 'Bagian', 'Sesi', 'Penutup'];
  return `[${terms[0]}] Mulai pengerjaan task "${task.slice(0, 25)}..." — kamu sudah selangkah lebih dekat! 💪`;
}

function mockReport(data: {
  taskCount: number;
  rsdCount: number;
  avgEnergy: number;
  switchCount: number;
}): string {
  return `**Ringkasan Kesehatan Mental & Produktivitas**
Periode: 7 hari terakhir

**Task Management**
Pengguna berhasil membuat ${data.taskCount} task dan menyelesaikan beberapa micro-task. Terdeteksi pola avoidance pada beberapa task dengan view count tinggi namun completion rendah — mengindikasikan task paralysis.

**Regulasi Emosi**
Tercatat ${data.rsdCount} episode RSD selama periode ini. Trigger utama: kritik eksternal dan perbandingan sosial. Intensitas bervariasi (energi 1–3/5).

**Fokus & Atensi**
Rata-rata energi harian: ${data.avgEnergy}/5. Terdeteksi ${data.switchCount} context switch, dengan estimasi kehilangan fokus sekitar ${Math.round(data.switchCount * 1.5)} menit per hari.

**Rekomendasi Klinis**
1. Eksplorasi strategi eksternalisasi tugas (to-do list visual, body doubling)
2. Latihan distress tolerance untuk RSD episode
3. Pertimbangkan evaluasi lebih lanjut terkait pola regulasi emosi

*Catatan: Laporan ini dibuat otomatis dari data behavioral self-report. Tidak menggantikan penilaian klinis profesional.*`;
}

function mockMoodAnalysis(moodText: string): string {
  return JSON.stringify({
    summary: `Kamu merasakan "${moodText.slice(0, 40)}" hari ini. Terima kasih sudah meluangkan waktu untuk check in.`,
    suggestion: 'Coba istirahat 5 menit dengan mata tertutup, lalu kerjakan satu hal kecil yang paling mudah. Otak ADHD butuh micro-wins untuk membangun momentum.',
    affirmation: 'Kamu sudah melakukan hal luar biasa dengan mengenali dan mengungkapkan perasaanmu hari ini. 💙',
    warningLevel: 'normal',
  });
}

function mockFrictionBuster(taskTitle: string, lang: Lang): string {
  if (lang === 'en') {
    return JSON.stringify({
      type: 'email_draft',
      title: `First draft for: "${taskTitle.slice(0, 40)}"`,
      content: `Hi,\n\nI'd like to get started on "${taskTitle}".\n\nHere's the first step I'll take:\n1. [The easiest first step]\n2. [Second step as a follow-up]\n\nI'll share a progress update within the next 24 hours.\n\nBest,\n[Your name]`,
    });
  }
  return JSON.stringify({
    type: 'email_draft',
    title: `Draft awal untuk: "${taskTitle.slice(0, 40)}"`,
    content: `Hai,\n\nSaya ingin memulai pengerjaan untuk "${taskTitle}".\n\nBerikut langkah pertama yang akan saya lakukan:\n1. [Langkah pertama yang paling mudah]\n2. [Langkah kedua sebagai follow-up]\n\nSaya akan update progress dalam 24 jam ke depan.\n\nSalam,\n[Nama kamu]`,
  });
}

// ============================================================
// PUBLIC API
// ============================================================

export interface DecomposedTask {
  microTasks: Array<{
    title: string;
    estimatedMinutes: number;
    group?: string;
    parallel?: boolean;
    dependsOn?: string[];
  }>;
  groups?: Array<{
    label: string;
    type: 'sequential' | 'parallel' | 'optional';
  }>;
}

export async function decomposeTasks(
  taskTitle: string,
  interests: string[],
  energyLevel: number,
  lang: Lang = 'id'
): Promise<DecomposedTask> {
  const prompt =
    lang === 'en'
      ? (() => {
          const interestCtx = interests.length > 0 ? `The user really likes: ${interests.join(', ')}.` : '';
          const energyCtx = energyLevel <= 2 ? "The user's energy is low, keep the tasks as simple and short as possible." : '';
          return `You are a productivity assistant for people with ADHD.
${interestCtx} ${energyCtx}

Task to break down: "${taskTitle}"

Break this task into 4–6 micro-tasks that:
- Can each be completed in 2–10 minutes
- Are very specific (not generic like "start working on it")
- Use casual, natural English
- Start with an active verb
- Are grouped into phases/groups (e.g. Phase 1: Prep, Phase 2: Execution, Phase 3: Wrap-up)
- Mark which ones can be done in parallel (parallel: true)

Respond ONLY with this JSON format:
{
  "microTasks": [
    { "title": "...", "estimatedMinutes": 5, "group": "Phase 1: Prep", "parallel": false },
    ...
  ],
  "groups": [
    { "label": "Phase 1: Prep", "type": "sequential" },
    { "label": "Phase 2: Execution", "type": "parallel" },
    { "label": "Phase 3: Wrap-up", "type": "sequential" }
  ]
}`;
        })()
      : (() => {
          const interestCtx = interests.length > 0 ? `User sangat suka: ${interests.join(', ')}.` : '';
          const energyCtx = energyLevel <= 2 ? 'Energy user rendah, buat task sesederhana dan sependek mungkin.' : '';
          return `Kamu adalah asisten produktivitas untuk orang dengan ADHD.
${interestCtx} ${energyCtx}

Task yang perlu dipecah: "${taskTitle}"

Pecah task ini menjadi 4–6 micro-task yang:
- Masing-masing bisa diselesaikan dalam 2–10 menit
- Sangat spesifik (bukan generik seperti "mulai kerjakan")
- Menggunakan bahasa Indonesia santai
- Dimulai dengan kata kerja aktif
- Dikelompokkan dalam fase/group (misal: Fase 1: Persiapan, Fase 2: Eksekusi, Fase 3: Finalisasi)
- Tandai mana yang bisa dikerjakan paralel (parallel: true)

Respond ONLY dengan JSON format ini:
{
  "microTasks": [
    { "title": "...", "estimatedMinutes": 5, "group": "Fase 1: Persiapan", "parallel": false },
    ...
  ],
  "groups": [
    { "label": "Fase 1: Persiapan", "type": "sequential" },
    { "label": "Fase 2: Eksekusi", "type": "parallel" },
    { "label": "Fase 3: Finalisasi", "type": "sequential" }
  ]
}`;
        })();

  try {
    const raw = await callGemini(prompt, 1024, false, lang);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as DecomposedTask;
  } catch {
    return JSON.parse(mockDecompose(taskTitle, lang)) as DecomposedTask;
  }
}

export async function reframeWithInterest(
  microTaskTitle: string,
  interestKeywords: string[],
  lang: Lang = 'id'
): Promise<string> {
  if (interestKeywords.length === 0) return microTaskTitle;

  const interest = interestKeywords[0];
  const prompt =
    lang === 'en'
      ? `You are a creative game master / storyteller.
The user really likes: "${interest}".

Reframe this task sentence into a more engaging version using language/metaphors from ${interest}.
Original task: "${microTaskTitle}"

Respond ONLY with 1 reframed sentence (no explanation), max 80 characters, in casual English.
Example for anime: "⚔️ Activate Sharingan — open the document and scope out the terrain"
Example for game: "🎮 Side quest: check the brief before the main battle begins"`
      : `Kamu adalah game master / storyteller kreatif.
User sangat suka: "${interest}".

Reframe kalimat task ini menjadi versi yang lebih menarik menggunakan bahasa/metafora dari ${interest}.
Task asli: "${microTaskTitle}"

Respond ONLY dengan 1 kalimat reframed (bukan penjelasan), maksimal 80 karakter, dalam bahasa Indonesia santai.
Contoh untuk anime: "⚔️ Aktifkan Sharingan — buka dokumen dan kenali medannya"
Contoh untuk game: "🎮 Side quest: cek brief sebelum battle utama dimulai"`;

  try {
    const raw = await callGemini(prompt, 1024, false, lang);
    return raw.replace(/^[\"']|[\"']$/g, '').trim();
  } catch {
    return mockReframe(microTaskTitle, interest ?? 'anime', lang);
  }
}

export interface MoodAnalysisResult {
  summary: string;
  suggestion: string;
  affirmation: string;
  warningLevel: 'normal' | 'at_risk' | 'crisis';
}

export async function analyzeMood(
  moodText: string,
  energyLevel: number
): Promise<MoodAnalysisResult> {
  const prompt = `Kamu adalah psikolog ADHD yang empatik, berbicara hangat dan santai seperti teman yang paham.

User menuliskan perasaannya hari ini:
"${moodText}"

Level energi mereka: ${energyLevel}/5

Analisis perasaan ini dan:
1. Buat ringkasan singkat yang empatik (1 kalimat)
2. Beri satu saran konkret yang bisa dilakukan SEKARANG (1-2 kalimat, sangat spesifik dan kecil)
3. Beri afirmasi hangat (1 kalimat, maksimal 15 kata)
4. Tentukan warning level:
   - "normal": mood biasa, tidak ada tanda distress
   - "at_risk": ada tanda kelelahan/overwhelm tapi masih bisa di-manage
   - "crisis": tanda burnout parah, paralysis, atau distress tinggi yang butuh perhatian extra

Respond ONLY dengan JSON:
{
  "summary": "...",
  "suggestion": "...",
  "affirmation": "...",
  "warningLevel": "normal" | "at_risk" | "crisis"
}`;

  try {
    const raw = await callGemini(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]) as MoodAnalysisResult;
  } catch {
    return JSON.parse(mockMoodAnalysis(moodText)) as MoodAnalysisResult;
  }
}

export interface FrictionBusterResult {
  type: 'email_draft' | 'template' | 'links' | 'outline';
  title: string;
  content: string;
}

export async function generateFrictionBuster(
  taskTitle: string,
  microTaskTitle: string,
  lang: Lang = 'id'
): Promise<FrictionBusterResult> {
  const prompt =
    lang === 'en'
      ? `You are an ADHD assistant who can take over the initial friction of a task.

The user is completely stuck and can't start this task:
- Main task: "${taskTitle}"
- Micro-task they can't start: "${microTaskTitle}"

Pick ONE of the following actions, whichever is most relevant:
1. Write a first draft email/message (type: "email_draft")
2. Create an empty template/outline ready to fill in (type: "template")
3. Find 3 relevant starter references/sources (type: "links")
4. Create a very detailed first-step outline (type: "outline")

Produce content the user can actually use right away — not instructions, but ACTUAL CONTENT.
Use English. Maximum 200 words for the content.

Respond ONLY with JSON:
{
  "type": "...",
  "title": "Short title for the generated result",
  "content": "Ready-to-use content..."
}`
      : `Kamu adalah asisten ADHD yang bisa mengambil alih friction awal sebuah task.

User stuck total tidak bisa memulai task ini:
- Task utama: "${taskTitle}"
- Micro-task yang tidak bisa dimulai: "${microTaskTitle}"

Pilih SATU dari tindakan berikut yang paling relevan:
1. Tulis draft email/pesan pertama (type: "email_draft")
2. Buat template/outline kosong siap diisi (type: "template")
3. Carikan 3 referensi/sumber awal yang relevan (type: "links")
4. Buat outline langkah pertama yang sangat detail (type: "outline")

Buat konten yang benar-benar bisa langsung dipakai user — bukan instruksi, tapi KONTEN AKTUAL.
Gunakan bahasa Indonesia. Maksimal 200 kata untuk content.

Respond ONLY dengan JSON:
{
  "type": "...",
  "title": "Judul singkat hasil yang dibuat",
  "content": "Isi konten yang siap pakai..."
}`;

  try {
    const raw = await callGemini(prompt, 512, false, lang);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]) as FrictionBusterResult;
  } catch {
    return JSON.parse(mockFrictionBuster(taskTitle, lang)) as FrictionBusterResult;
  }
}

export async function generateNakesReport(data: {
  profile: { name: string; interests: string[] };
  taskCount: number;
  completedTaskCount: number;
  rsdEvents: Array<{ triggers: string[]; energyLevel: number; timestamp: string }>;
  avgEnergy: number;
  contextSwitchCount: number;
  timeEstimates: Array<{ calibrationFactor: number }>;
}): Promise<string> {
  const avgCalibration =
    data.timeEstimates.length > 0
      ? (data.timeEstimates.reduce((s, e) => s + e.calibrationFactor, 0) / data.timeEstimates.length).toFixed(1)
      : '2.5';

  const prompt = `Kamu adalah psikolog klinis yang membuat laporan ringkasan untuk kolega atau tenaga kesehatan.

Data pasien (${data.profile.name}):
- Total task dibuat: ${data.taskCount}
- Task selesai: ${data.completedTaskCount}
- Episode RSD: ${data.rsdEvents.length}
- Trigger utama: ${[...new Set(data.rsdEvents.flatMap((e) => e.triggers))].slice(0, 3).join(', ')}
- Rata-rata level energi: ${data.avgEnergy.toFixed(1)}/5
- Context switch terdeteksi: ${data.contextSwitchCount} kali
- Faktor kalibrasi waktu: ${avgCalibration}x (estimasi selalu di bawah ${avgCalibration}x dari waktu aktual)

Tulis laporan ringkasan klinis dalam Bahasa Indonesia yang:
1. Profesional tapi bisa dibaca orang awam
2. Berisi: ringkasan perilaku, pola yang terdeteksi, area perhatian, dan rekomendasi
3. Sertakan disclaimer bahwa ini data self-report berbasis aplikasi
4. Gunakan format dengan heading ## dan bullet points
Maksimal 400 kata.`;

  try {
    return await callGemini(prompt);
  } catch {
    return mockReport({
      taskCount: data.taskCount,
      rsdCount: data.rsdEvents.length,
      avgEnergy: data.avgEnergy,
      switchCount: data.contextSwitchCount,
    });
  }
}

// ============================================================
// KNOWLEDGE BASE SYNTHESIS (onboarding deep questionnaire)
// ============================================================

const CHRONOTYPE_LABEL: Record<Lang, Record<string, string>> = {
  id: { morning: 'pagi hari', afternoon: 'siang/sore hari', night: 'malam hari', variable: 'jam yang berubah-ubah' },
  en: { morning: 'the morning', afternoon: 'the afternoon', night: 'the night', variable: 'varying hours' },
};

const MOTIVATION_LABEL: Record<Lang, Record<string, string>> = {
  id: {
    gamification: 'gamifikasi (poin, achievement, streak)',
    deadline_pressure: 'tekanan deadline/urgensi',
    social_accountability: 'akuntabilitas sosial (dilihat/dilaporkan ke orang lain)',
    curiosity: 'rasa penasaran/eksplorasi',
  },
  en: {
    gamification: 'gamification (points, achievements, streaks)',
    deadline_pressure: 'deadline/urgency pressure',
    social_accountability: 'social accountability (being seen/reporting to someone)',
    curiosity: 'curiosity/exploration',
  },
};

function mockKnowledgeBaseSummary(name: string, answers: QuestionnaireAnswers, lang: Lang): string {
  const chronotype = CHRONOTYPE_LABEL[lang][answers.chronotype] ?? answers.chronotype;
  const motivation = MOTIVATION_LABEL[lang][answers.motivationStyle] ?? answers.motivationStyle;

  if (lang === 'en') {
    const triggers = answers.procrastinationTriggers.length > 0 ? answers.procrastinationTriggers.join(', ') : 'nothing specific';
    return `${name} focuses best during ${chronotype}, with an attention span of about ${answers.focusSpanMinutes} minutes before needing a break. ` +
      `What most often blocks getting started: ${triggers}. The push that works best for ${name} is ${motivation}. ` +
      `${answers.rsdSensitivity >= 4 ? `${name} is fairly sensitive to criticism/failure, so a gentle, low-pressure approach matters a lot.` : `${name} handles criticism relatively well, so a more direct framing still works.`} ` +
      `${answers.bodyDoublingHelps ? 'Working alongside someone else (body doubling) helps keep focus.' : 'They tend to focus better working alone.'}`;
  }

  const triggers = answers.procrastinationTriggers.length > 0 ? answers.procrastinationTriggers.join(', ') : 'belum spesifik';
  return `${name} paling fokus di ${chronotype}, dengan rentang atensi sekitar ${answers.focusSpanMinutes} menit sebelum butuh jeda. ` +
    `Yang paling menghambat mulai bekerja: ${triggers}. Dorongan yang paling cocok untuk ${name} adalah ${motivation}. ` +
    `${answers.rsdSensitivity >= 4 ? `${name} cukup sensitif terhadap kritik/kegagalan, jadi pendekatan yang lembut dan tanpa tekanan sangat penting.` : `${name} relatif tahan terhadap kritik, jadi framing yang lebih tegas masih bisa diterima.`} ` +
    `${answers.bodyDoublingHelps ? 'Bekerja bareng orang lain (body doubling) membantu menjaga fokusnya.' : 'Ia cenderung lebih fokus saat bekerja sendiri.'}`;
}

export async function generateKnowledgeBaseSummary(
  name: string,
  answers: QuestionnaireAnswers,
  lang: Lang = 'id'
): Promise<string> {
  const prompt =
    lang === 'en'
      ? `You synthesize answers from an ADHD personality/work-style questionnaire into one personal narrative summary — like NotebookLM condensing many sources into one coherent overview.

User's name: ${name}
Questionnaire answers:
- ADHD subtype (self-report): ${answers.adhdSubtype}
- Best focus time: ${answers.chronotype}
- Attention span before getting distracted: ${answers.focusSpanMinutes} minutes
- Triggers that make starting hard: ${answers.procrastinationTriggers.join(', ') || 'nothing specific'}
- Most effective motivation style: ${answers.motivationStyle}
- Sensitivity to criticism/failure (RSD), scale 1-5: ${answers.rsdSensitivity}
- Helped by body doubling: ${answers.bodyDoublingHelps ? 'yes' : 'no'}
- Preferred AI communication tone: ${answers.communicationTone}
- Sensory sensitivity (loud noise/bright light): ${answers.sensorySensitivity}

Write 1 paragraph (max 90 words), English, third person, warm and personal, summarizing who ${name} is in how they work and what support they need. No lists/bullets, write it as flowing narrative.`
      : `Kamu adalah asisten yang menyintesis jawaban kuesioner kepribadian & gaya kerja ADHD menjadi satu ringkasan naratif yang personal — mirip seperti NotebookLM merangkum banyak sumber menjadi satu overview yang koheren.

Nama user: ${name}
Jawaban kuesioner:
- Subtipe ADHD (self-report): ${answers.adhdSubtype}
- Waktu paling fokus: ${answers.chronotype}
- Rentang fokus sebelum terdistraksi: ${answers.focusSpanMinutes} menit
- Trigger susah memulai kerja: ${answers.procrastinationTriggers.join(', ') || 'tidak ada yang spesifik'}
- Gaya motivasi yang paling efektif: ${answers.motivationStyle}
- Sensitivitas terhadap kritik/kegagalan (RSD), skala 1-5: ${answers.rsdSensitivity}
- Terbantu dengan body doubling: ${answers.bodyDoublingHelps ? 'ya' : 'tidak'}
- Preferensi gaya komunikasi AI: ${answers.communicationTone}
- Sensitivitas sensorik (suara/cahaya berlebih): ${answers.sensorySensitivity}

Tulis 1 paragraf (maksimal 90 kata), bahasa Indonesia, orang ketiga, hangat dan personal, yang merangkum siapa ${name} dalam cara bekerja & butuh dukungan seperti apa. Jangan berikan daftar/bullet, tulis sebagai narasi mengalir.`;

  try {
    return await callGemini(prompt, 300, false, lang);
  } catch (err) {
    warnMockFallback('generateKnowledgeBaseSummary', err);
    return mockKnowledgeBaseSummary(name, answers, lang);
  }
}

// ============================================================
// COMPANION CHATBOT
// ============================================================

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const COMPANION_SYSTEM_PROMPT: Record<Lang, string> = {
  id: `Kamu adalah Pulse, teman curhat yang hangat dan pengertian untuk orang dengan ADHD. Kamu bukan psikolog formal — kamu adalah safe space yang empatik dan suportif.

Karaktermu:
- Berbicara seperti teman dekat yang benar-benar peduli, pakai "kamu" bukan "Anda"
- Hangat, sabar, tidak pernah menghakimi
- Menggunakan bahasa Indonesia santai dan natural
- Sesekali pakai emoji yang relevan tapi tidak berlebihan
- Validasi perasaan dulu sebelum memberi saran
- Kalau user terlihat burnout/overwhelm: fokus pada comfort dulu, saran belakangan
- Kalau user minta saran: beri yang konkret dan kecil, mudah dilakukan
- Respon pendek-sedang (2-4 paragraf), tidak perlu panjang
- Tidak pernah dismiss perasaan user
- Kalau situasi terasa berat banget atau ada tanda krisis: dengan lembut suggest untuk bicara ke profesional

Ingat: Kamu ada di sini untuk mendengar, bukan untuk "fix" orang. Sometimes just being heard is enough.`,
  en: `You are Pulse, a warm and understanding companion for people with ADHD. You're not a formal psychologist — you're an empathetic, supportive safe space.

Your character:
- Talk like a close friend who genuinely cares
- Warm, patient, never judgmental
- Use natural, casual English
- Occasionally use relevant emoji, but don't overdo it
- Validate feelings first before giving advice
- If the user seems burnt out/overwhelmed: focus on comfort first, advice later
- If the user asks for advice: give something concrete and small, easy to do
- Keep responses short-to-medium (2-4 paragraphs), no need to be long
- Never dismiss the user's feelings
- If things feel really heavy or there are signs of crisis: gently suggest talking to a professional

Remember: You're here to listen, not to "fix" people. Sometimes just being heard is enough.`,
};

const COMPANION_GREETING: Record<Lang, string> = {
  id: 'Hei! Aku Pulse, teman curhatmu di sini. 💙 Cerita aja, aku dengerin. Lagi gimana hari ini?',
  en: "Hey! I'm Pulse, your companion here. 💙 Go ahead and talk to me, I'm listening. How's today going?",
};

const COMPANION_FALLBACKS: Record<Lang, string[]> = {
  id: [
    'Hei, aku lagi susah connect sekarang 🌙 Tapi aku dengerin kamu kok. Cerita terus ya, nanti aku respon begitu bisa.',
    'Koneksi lagi agak lemot nih... Tapi kamu nggak sendirian. Kalau mau curhat, tulis aja dulu — aku bakal baca semuanya. 💙',
    'Ups, ada gangguan teknis sebentar. Yang penting kamu ingat: perasaan kamu valid, apapun itu. 🌸',
  ],
  en: [
    "Hey, I'm having trouble connecting right now 🌙 But I'm still listening. Keep talking, I'll respond as soon as I can.",
    "Connection's a bit slow right now... But you're not alone. If you want to talk, just write it out — I'll read all of it. 💙",
    "Oops, a small technical hiccup. Just remember: your feelings are valid, whatever they are. 🌸",
  ],
};

export async function chatWithCompanion(
  messages: ChatMessage[],
  userContext?: {
    avgEnergy?: number;
    rsdEventsCount?: number;
    completedTasksToday?: number;
  },
  lang: Lang = 'id'
): Promise<string> {
  const contextNote = userContext
    ? lang === 'en'
      ? `\n\n[Context from the app: average energy ${userContext.avgEnergy?.toFixed(1) ?? '?'}/5, ${userContext.rsdEventsCount ?? 0} RSD episodes logged, ${userContext.completedTasksToday ?? 0} tasks completed today]`
      : `\n\n[Context dari app: energi rata-rata ${userContext.avgEnergy?.toFixed(1) ?? '?'}/5, ${userContext.rsdEventsCount ?? 0} episode RSD tercatat, ${userContext.completedTasksToday ?? 0} task selesai hari ini]`
    : '';

  const startNote = lang === 'en' ? '\n\n---\nStart the conversation now.' : '\n\n---\nMulai percakapan sekarang.';

  // Build conversation history for Gemini
  const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [
    // Inject system prompt as first user-model exchange
    {
      role: 'user',
      parts: [{ text: COMPANION_SYSTEM_PROMPT[lang] + contextNote + startNote }],
    },
    {
      role: 'model',
      parts: [{ text: COMPANION_GREETING[lang] }],
    },
    ...messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  ];

  try {
    return await callGeminiWithHistory(history, 600, lang);
  } catch (err) {
    warnMockFallback('chatWithCompanion', err);
    const fallbacks = COMPANION_FALLBACKS[lang];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)] as string;
  }
}
