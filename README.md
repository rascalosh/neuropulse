# 🧠 NeuroPulse

**Companion app untuk orang dengan ADHD** — membantu memecah tugas yang overwhelming, menjaga fokus, meregulasi emosi, dan membangun momentum lewat gamifikasi. Dibangun dengan pendekatan *ADHD-friendly design*: micro-wins, friksi rendah, dan visual yang tenang.

Mendukung dua bahasa (🇮🇩 Indonesia / 🇬🇧 English), light & dark mode, serta berbagai alat aksesibilitas.

---

## ✨ Fitur

### Produktivitas
| Fitur | Deskripsi |
|---|---|
| **AI Task Decomposition** | Pecah satu task besar menjadi 4–6 micro-task (2–10 menit) lengkap dengan fase, estimasi waktu, dan penanda paralel — divisualisasikan sebagai *quest path* ala game. Mendukung input suara. |
| **Interest Reframing** | Judul micro-task di-reframe memakai metafora dari minat user (anime, game, musik, dll.) agar lebih menarik dikerjakan. |
| **Friction Buster** | Saat user benar-benar stuck, AI mengambil alih langkah pertama: menulis draft email, template, outline, atau referensi awal yang langsung bisa dipakai. |
| **Task Decay & Stuck Detection** | Task yang sering dilihat tapi tidak dikerjakan terdeteksi sebagai *task paralysis* dan memicu banner intervensi. |
| **Focus Mirror** | Sesi fokus dengan kamera + MediaPipe face tracking untuk memantau fokus secara real-time, lengkap dengan skor fokus dan statistik sesi. |
| **Body Double** | Ruang kerja bareng virtual, video *study-with-me* dari YouTube, dan ambient audio (hujan, kafe, lofi) dengan pomodoro timer. |
| **OmniFocus Reader** | Mode baca ADHD-friendly: Bionic Reading, ekstraksi teks PDF, analisis gambar (Gemini Vision), perapian teks berantakan, ringkasan poin-poin, dan text-to-speech. |

### Kesehatan Mental
| Fitur | Deskripsi |
|---|---|
| **Energy Check-in** | Catat level energi harian (dengan maskot ekspresif) + tulis perasaan; AI memberikan ringkasan empatik, saran konkret, afirmasi, dan deteksi *warning level* (normal / at-risk / crisis). |
| **Pulse — Companion Chatbot** | Teman curhat AI yang hangat dan tidak menghakimi, sadar konteks (energi rata-rata, episode RSD, task selesai hari ini). Tersedia di semua halaman. |
| **Clinical Report** | Generate laporan ringkasan perilaku (task, RSD, energi, context switch) yang bisa dibawa ke tenaga kesehatan profesional. |
| **Psychologist Marketplace** | Direktori psikolog spesialis ADHD dengan booking sesi, diskon per-tier, dan manajemen jadwal di halaman *My Sessions*. |

### Motivasi & Lainnya
| Fitur | Deskripsi |
|---|---|
| **Gamifikasi** | XP, 8 level (Benih 🌱 → Mythic 🌟), streak harian, dan bonus login. |
| **Dopamine Machine** | Mesin gachapon berisi reward buatan user sendiri — selesaikan task, putar mesinnya, nikmati hadiahnya. |
| **Onboarding Kuesioner** | Kuesioner mendalam (kronotipe, rentang fokus, trigger prokrastinasi, sensitivitas RSD, dll.) yang disintesis AI menjadi *knowledge base* personal. |
| **Tier & Pricing** | 4 tier langganan dengan limit fitur (decompose, bionic reading, laporan klinis), durasi fokus maksimal, dan diskon sesi psikolog. |
| **Aksesibilitas** | Panel khusus: skala font, kontras tinggi, reduced motion, Bionic Reading global, dan TTS di seluruh halaman. |

---

## 🤖 Arsitektur AI

```
Client (lib/gemini.ts)
   │
   ▼
/api/gemini  ──►  Google Gemini (gemini-3.1-flash-lite)
   │                    │
   │              rate limit / quota? (429, RESOURCE_EXHAUSTED)
   │                    ▼
   └──────────►  /api/grok  ──►  xAI Grok (grok-4-fast)
                        │
                  masih gagal?
                        ▼
                 Mock fallback offline (selalu ada respons)
```

- **Semua API key LLM hanya hidup di server** (Next.js Route Handlers) — tidak pernah masuk bundle client.
- **Auto-switch ke Grok** hanya saat Gemini melaporkan rate limit / kehabisan kuota; error lain tetap jatuh ke mock fallback.
- Guardrail bahasa (ID/EN) + pembersihan karakter CJK liar diterapkan di kedua provider.

---

## 🛠 Tech Stack

| Layer | Teknologi |
|---|---|
| **Monorepo** | [Turborepo](https://turborepo.dev/) + npm workspaces |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) · React 19 · TypeScript 5.9 |
| **Styling** | CSS Modules + design tokens custom (light/dark/accent presets) · [Framer Motion](https://www.framer.com/motion/) |
| **Auth & Database** | [Supabase](https://supabase.com/) (`@supabase/ssr` untuk session middleware) + SQL migrations |
| **AI — Text** | Google **Gemini** (utama) · xAI **Grok** (backup otomatis) via server-side proxy |
| **AI — Vision** | Gemini Vision (analisis gambar) · [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe) (face landmark untuk Focus Mirror) |
| **Dokumen & Suara** | [pdf.js](https://mozilla.github.io/pdf.js/) (ekstraksi PDF) · Google TTS + Web Speech API |
| **Backend API** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12) + Supabase client — health check & fondasi API |
| **Tooling** | ESLint 9 · Prettier · shared config packages |

---

## 📁 Struktur Monorepo

```
neuropulse/
├── apps/
│   ├── web/                  # Next.js app (aplikasi utama)
│   │   ├── app/
│   │   │   ├── (app)/        # Halaman ber-auth: dashboard, tasks, focus-mirror,
│   │   │   │                 #   body-double, energy-checkin, dopamine, omnifocus,
│   │   │   │                 #   report, psychologists, my-sessions, pricing,
│   │   │   │                 #   leveling, profile
│   │   │   ├── api/          # Route handlers: gemini, grok, decompose, bionic,
│   │   │   │                 #   bookings, payments, psychologists, reports, ...
│   │   │   ├── login/        # Auth (Supabase)
│   │   │   └── onboarding/   # Kuesioner + sintesis AI
│   │   ├── components/       # Nav, TopBar, CompanionChatbot, OmniFocusReader,
│   │   │                     #   AccessibilityPanel, ReadingAids
│   │   ├── lib/              # gemini, gamification, tiers, storage, i18n, tts
│   │   ├── hooks/            # useStorage, useContextSwitch
│   │   └── supabase/         # Migrations & seed
│   └── backend/              # FastAPI + Supabase (Python)
├── packages/
│   ├── ui/                   # Komponen React shared
│   ├── eslint-config/        # Konfigurasi ESLint shared
│   └── typescript-config/    # tsconfig shared
└── turbo.json
```

---

## 🚀 Menjalankan Secara Lokal

**Prasyarat:** Node.js ≥ 18, npm ≥ 11, Python 3.12 (untuk backend).

```bash
# 1. Install dependensi JS
npm install

# 2. Setup env frontend
cp apps/web/.env.example apps/web/.env
#    → isi kredensial Supabase, GEMINI_API_KEY, GROK_API_KEY (opsional)

# 3. Setup backend Python (sekali saja)
cd apps/backend
python -m venv venv
venv/Scripts/pip install -r requirements.txt   # Windows
# venv/bin/pip install -r requirements.txt     # macOS/Linux
cp .env.example .env                            # isi kredensial Supabase
cd ../..

# 4. Jalankan semuanya (web :3000 + backend :8000)
npm run dev
```

### Environment Variables (`apps/web/.env`)

| Variabel | Sisi | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Anon/publishable key Supabase |
| `GEMINI_API_KEY` | **Server only** | API key Google Gemini — dipakai `/api/gemini` |
| `GEMINI_MODEL` | Server | Opsional, default `gemini-3.1-flash-lite` |
| `GROK_API_KEY` | **Server only** | API key xAI — backup otomatis saat Gemini limit |
| `GROK_MODEL` | Server | Opsional, default `grok-4-fast` |
| `NEXT_PUBLIC_GOOGLE_TTS_API_KEY` | Client | Text-to-speech |

> ⚠️ Key **tanpa** prefix `NEXT_PUBLIC_` sengaja dibaca hanya di server (Route Handlers) agar tidak pernah ter-bundle ke JavaScript client.

### Perintah Lain

```bash
npm run build          # Build semua workspace
npm run lint           # Lint semua workspace
npm run check-types    # Typecheck semua workspace
npx turbo dev --filter=web   # Jalankan web saja
```

---

## 📦 Deployment

- **Frontend** di-deploy ke **Vercel** (root: `apps/web`, install command `npm install --prefix=../..`). Pastikan semua env var di atas terisi di dashboard Vercel — termasuk `GEMINI_API_KEY`/`GROK_API_KEY` versi server-side.
- **Database & Auth** dikelola Supabase; jalankan migrations di `apps/web/supabase/migrations`.
