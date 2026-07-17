// lib/gemini.ts — Gemini API wrapper with offline fallback

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.1-flash-lite';
const API_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string };
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

const SYSTEM_INSTRUCTION =
  'Kamu HANYA boleh merespon dalam Bahasa Indonesia (atau Inggris jika diminta eksplisit). ' +
  'JANGAN PERNAH menghasilkan karakter Mandarin/China, Jepang, Korea, atau aksara non-Latin lainnya, ' +
  'bahkan sebagai typo atau campuran sebagian kata. Jika ragu, gunakan Bahasa Indonesia biasa.';

async function callGemini(prompt: string, maxTokens = 1024, expectJson = false): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('NO_API_KEY — isi NEXT_PUBLIC_GEMINI_API_KEY di apps/web/.env lalu restart dev server');
  }

  const response = await fetch(`${API_BASE}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: maxTokens,
        topP: 0.9,
        ...(expectJson ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API_ERROR ${response.status}: ${body.slice(0, 200)}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) throw new Error(data.error.message);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
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

async function callGeminiWithHistory(
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  maxTokens = 800
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('NO_API_KEY — isi NEXT_PUBLIC_GEMINI_API_KEY di apps/web/.env lalu restart dev server');
  }

  const response = await fetch(`${API_BASE}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: history,
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: maxTokens,
        topP: 0.9,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API_ERROR ${response.status}: ${body.slice(0, 200)}`);
  }

  const data: GeminiResponse = await response.json();
  if (data.error) throw new Error(data.error.message);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('EMPTY_RESPONSE');

  return text.trim();
}

function warnMockFallback(feature: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[Gemini] ${feature}: pakai mock fallback — ${msg}`);
}

// ============================================================
// MOCK FALLBACKS (used when no API key or rate limit hit)
// ============================================================

function mockDecompose(task: string): string {
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

function mockReframe(task: string, interest: string): string {
  const maps: Record<string, string[]> = {
    anime: ['Quest', 'Arc', 'Skill', 'Boss battle', 'Power-up'],
    game: ['Mission', 'Level', 'Achievement', 'Checkpoint', 'Loot'],
    masak: ['Resep', 'Bahan', 'Langkah memasak', 'Plating', 'Hidangan'],
    musik: ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'],
    olahraga: ['Warm-up', 'Set', 'Rep', 'Sprint', 'Cool-down'],
  };
  const terms = maps[interest.toLowerCase()] || ['Fase', 'Langkah', 'Bagian', 'Sesi', 'Penutup'];
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

function mockFrictionBuster(taskTitle: string): string {
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
  energyLevel: number
): Promise<DecomposedTask> {
  const interestCtx = interests.length > 0 ? `User sangat suka: ${interests.join(', ')}.` : '';
  const energyCtx = energyLevel <= 2 ? 'Energy user rendah, buat task sesederhana dan sependek mungkin.' : '';

  const prompt = `Kamu adalah asisten produktivitas untuk orang dengan ADHD.
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

  try {
    const raw = await callGemini(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as DecomposedTask;
  } catch {
    return JSON.parse(mockDecompose(taskTitle)) as DecomposedTask;
  }
}

export async function reframeWithInterest(
  microTaskTitle: string,
  interestKeywords: string[]
): Promise<string> {
  if (interestKeywords.length === 0) return microTaskTitle;

  const interest = interestKeywords[0];
  const prompt = `Kamu adalah game master / storyteller kreatif.
User sangat suka: "${interest}".

Reframe kalimat task ini menjadi versi yang lebih menarik menggunakan bahasa/metafora dari ${interest}.
Task asli: "${microTaskTitle}"

Respond ONLY dengan 1 kalimat reframed (bukan penjelasan), maksimal 80 karakter, dalam bahasa Indonesia santai.
Contoh untuk anime: "⚔️ Aktifkan Sharingan — buka dokumen dan kenali medannya"
Contoh untuk game: "🎮 Side quest: cek brief sebelum battle utama dimulai"`;

  try {
    const raw = await callGemini(prompt);
    return raw.replace(/^[\"']|[\"']$/g, '').trim();
  } catch {
    return mockReframe(microTaskTitle, interest ?? 'anime');
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
  microTaskTitle: string
): Promise<FrictionBusterResult> {
  const prompt = `Kamu adalah asisten ADHD yang bisa mengambil alih friction awal sebuah task.

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
    const raw = await callGemini(prompt, 512);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]) as FrictionBusterResult;
  } catch {
    return JSON.parse(mockFrictionBuster(taskTitle)) as FrictionBusterResult;
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
// COMPANION CHATBOT
// ============================================================

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const COMPANION_SYSTEM_PROMPT = `Kamu adalah Pulse, teman curhat yang hangat dan pengertian untuk orang dengan ADHD. Kamu bukan psikolog formal — kamu adalah safe space yang empatik dan suportif.

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

Ingat: Kamu ada di sini untuk mendengar, bukan untuk "fix" orang. Sometimes just being heard is enough.`;

export async function chatWithCompanion(
  messages: ChatMessage[],
  userContext?: {
    avgEnergy?: number;
    rsdEventsCount?: number;
    completedTasksToday?: number;
  }
): Promise<string> {
  const contextNote = userContext
    ? `\n\n[Context dari app: energi rata-rata ${userContext.avgEnergy?.toFixed(1) ?? '?'}/5, ${userContext.rsdEventsCount ?? 0} episode RSD tercatat, ${userContext.completedTasksToday ?? 0} task selesai hari ini]`
    : '';

  // Build conversation history for Gemini
  const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [
    // Inject system prompt as first user-model exchange
    {
      role: 'user',
      parts: [{ text: COMPANION_SYSTEM_PROMPT + contextNote + '\n\n---\nMulai percakapan sekarang.' }],
    },
    {
      role: 'model',
      parts: [{ text: 'Hei! Aku Pulse, teman curhatmu di sini. 💙 Cerita aja, aku dengerin. Lagi gimana hari ini?' }],
    },
    ...messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  ];

  try {
    return await callGeminiWithHistory(history, 600);
  } catch (err) {
    warnMockFallback('chatWithCompanion', err);
    // Friendly fallback responses
    const fallbacks = [
      'Hei, aku lagi susah connect sekarang 🌙 Tapi aku dengerin kamu kok. Cerita terus ya, nanti aku respon begitu bisa.',
      'Koneksi lagi agak lemot nih... Tapi kamu nggak sendirian. Kalau mau curhat, tulis aja dulu — aku bakal baca semuanya. 💙',
      'Ups, ada gangguan teknis sebentar. Yang penting kamu ingat: perasaan kamu valid, apapun itu. 🌸',
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)] as string;
  }
}
