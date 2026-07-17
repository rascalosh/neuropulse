'use client';

import {
  useState, useRef, useCallback, useEffect,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  toBionicHtml,
  summarizeForADHD,
  extractTextFromPdf,
  analyzeImageWithGemini,
  triggerTextToVideo,
  cleanTextWithGemini,
  type SummaryPoint,
  type TextToVideoResult,
} from '../lib/omnifocus';
import {
  IconVolume, IconBrain, IconBook, IconFolder, IconBoldText, IconRefresh,
  IconSparkles, IconClapperboard, IconInfo, IconPause, IconX, IconLightbulb,
} from './Icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type InputMode = 'text' | 'image' | 'pdf';
type ProcessingState = 'idle' | 'loading' | 'ready' | 'error';

interface StatusBadgeProps {
  isTalking: boolean;
  isThinking: boolean;
}

// Colorful rotation used for the summary list's numbered chips instead of
// whatever emoji Gemini happened to pick — keeps the UI icon-only.
const SUMMARY_CHIP_COLORS = ['#7C3AED', '#0D9488', '#D97706', '#2563EB', '#DB2777'];

// ─── Status Badge ──────────────────────────────────────────────────────────────
// Icon badge — swaps to a speaker icon while reading aloud, a brain while
// thinking, and a book at rest, so the state is legible at a glance.

function StatusBadge({ isTalking, isThinking }: StatusBadgeProps) {
  const Icon = isTalking ? IconVolume : isThinking ? IconBrain : IconBook;
  return (
    <motion.div
      className="omni-badge"
      animate={isTalking ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={isTalking ? { duration: 0.6, repeat: Infinity } : { duration: 0.2 }}
    >
      <Icon size={22} />
    </motion.div>
  );
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

interface DropZoneProps {
  onText: (t: string) => void;
  onImage: (dataUrl: string) => void;
  onPdf: (buffer: ArrayBuffer, name: string) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
}

function DropZone({ onText, onImage, onPdf, isDragging, setIsDragging }: DropZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      processFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onText, onImage, onPdf]
  );

  const processFile = (file: File) => {
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => onPdf(reader.result as ArrayBuffer, file.name);
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => onImage(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = () => onText(reader.result as string);
      reader.readAsText(file);
    }
  };

  return (
    <motion.div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      animate={{ borderColor: isDragging ? 'var(--omni-accent)' : 'var(--omni-border)', scale: isDragging ? 1.01 : 1 }}
      transition={{ duration: 0.2 }}
      className="omni-dropzone"
      style={{ background: isDragging ? 'var(--omni-accent-soft)' : 'var(--omni-surface)' }}
    >
      <input
        ref={fileRef}
        type="file"
        style={{ display: 'none' }}
        accept=".txt,.pdf,image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
          e.target.value = '';
        }}
      />
      <motion.div
        className="omni-dropzone-icon"
        animate={isDragging ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {isDragging ? <IconSparkles size={32} /> : <IconFolder size={32} />}
      </motion.div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, color: 'var(--omni-accent-text)', fontSize: '14px', marginBottom: 4 }}>
          {isDragging ? 'Lepas di sini!' : 'Drop file atau klik untuk pilih'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--omni-muted)' }}>
          Teks · Gambar (JPG/PNG) · PDF
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OmniFocusReader() {
  // ── State ──
  const [rawText, setRawText] = useState('');
  const [bionicHtml, setBionicHtml] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [state, setState] = useState<ProcessingState>('idle');
  const [summary, setSummary] = useState<SummaryPoint[] | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [videoResult, setVideoResult] = useState<TextToVideoResult | null>(null);
  const [isVideoQueued, setIsVideoQueued] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [bionicEnabled, setBionicEnabled] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [isCleaning, setIsCleaning] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  const hasContent = rawText.trim().length > 0 || imageDataUrl !== null;

  // ── Process text input ──
  const processText = useCallback((text: string) => {
    setRawText(text);
    setBionicHtml(toBionicHtml(text));
    setImageDataUrl(null);
    setSummary(null);
    setShowSummary(false);
    setState('ready');
    setInputMode('text');
  }, []);

  // ── Process image ──
  const processImage = useCallback(async (dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setRawText('');
    setBionicHtml('');
    setSummary(null);
    setShowSummary(false);
    setInputMode('image');
    setState('loading');
    setIsThinking(true);
    setStatusMsg('Membaca gambar dengan Gemini Vision...');

    try {
      const description = await analyzeImageWithGemini(dataUrl);
      setRawText(description);
      setBionicHtml(toBionicHtml(description));
      setState('ready');
      setStatusMsg('');
    } catch {
      setState('error');
      setStatusMsg('Gagal membaca gambar. Coba lagi.');
    } finally {
      setIsThinking(false);
    }
  }, []);

  // ── Process PDF ──
  const processPdf = useCallback(async (buffer: ArrayBuffer, name: string) => {
    setImageDataUrl(null);
    setSummary(null);
    setShowSummary(false);
    setInputMode('pdf');
    setState('loading');
    setIsThinking(true);
    setStatusMsg(`Memproses ${name}...`);

    try {
      const text = await extractTextFromPdf(buffer);
      setStatusMsg('Merapikan format teks PDF dengan AI...');
      const cleanedText = await cleanTextWithGemini(text);
      setRawText(cleanedText);
      setBionicHtml(toBionicHtml(cleanedText));
      setState('ready');
      setStatusMsg('PDF siap dibaca!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch {
      setState('error');
      setStatusMsg('Gagal memproses PDF.');
    } finally {
      setIsThinking(false);
    }
  }, []);

  // ── Bionic toggle ──
  useEffect(() => {
    if (rawText) setBionicHtml(toBionicHtml(rawText));
  }, [bionicEnabled, rawText]);

  // ── Clean Text ──
  const handleCleanText = async () => {
    if (!rawText.trim()) return;
    setIsCleaning(true);
    setIsThinking(true);
    setStatusMsg('Merapikan format teks dengan AI...');
    try {
      const cleaned = await cleanTextWithGemini(rawText);
      setRawText(cleaned);
      setBionicHtml(toBionicHtml(cleaned));
      setStatusMsg('Teks berhasil dirapikan!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch {
      setStatusMsg('Gagal merapikan teks. Coba lagi.');
    } finally {
      setIsCleaning(false);
      setIsThinking(false);
    }
  };

  // ── Summarize ──
  const handleSummarize = async () => {
    if (!rawText.trim()) return;
    setIsSummarizing(true);
    setIsThinking(true);
    setStatusMsg('Merangkum teks...');
    try {
      const points = await summarizeForADHD(rawText);
      setSummary(points);
      setShowSummary(true);
    } catch {
      setStatusMsg('Gagal merangkum. Coba lagi.');
    } finally {
      setIsSummarizing(false);
      setIsThinking(false);
      setStatusMsg('');
    }
  };

  // ── Text-to-Speech ──
  const handleTts = () => {
    if (!rawText.trim()) return;

    if (isTalking) {
      window.speechSynthesis.cancel();
      setIsTalking(false);
      return;
    }

    const utt = new SpeechSynthesisUtterance(rawText);
    utt.lang = 'id-ID';
    utt.rate = 0.9;
    utt.pitch = 1.0;

    utt.onstart = () => setIsTalking(true);
    utt.onend = () => setIsTalking(false);
    utt.onerror = () => setIsTalking(false);

    ttsRef.current = utt;
    window.speechSynthesis.speak(utt);
  };

  // Stop TTS on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // ── Text-to-Video ──
  const handleTextToVideo = async () => {
    if (!rawText.trim()) return;
    setIsVideoQueued(true);
    setStatusMsg('Mengirim ke generator video...');

    try {
      const result = await triggerTextToVideo({
        text: rawText.slice(0, 2000),
        style: 'educational',
        durationSeconds: 30,
        aspectRatio: '16:9',
      });
      setVideoResult(result);
      setStatusMsg(result.status === 'completed' ? 'Video siap!' : `Video sedang diproses (est. ~${result.estimatedSeconds}s)...`);
    } catch {
      setStatusMsg('Gagal memicu video. Sambungkan API text-to-video dulu.');
    } finally {
      setIsVideoQueued(false);
    }
  };

  // ── Clear ──
  const handleClear = () => {
    setRawText('');
    setBionicHtml('');
    setImageDataUrl(null);
    setSummary(null);
    setShowSummary(false);
    setState('idle');
    setStatusMsg('');
    setVideoResult(null);
    window.speechSynthesis?.cancel();
    setIsTalking(false);
  };

  return (
    <div className="omni-page">
      <div className="omni-container">

        {/* ── Header ── */}
        <div className="omni-header">
          <StatusBadge isTalking={isTalking} isThinking={isThinking} />
          <div className="omni-header-text">
            <h1 className="omni-title">OmniFocus Reader</h1>
            <p className="omni-subtitle">
              Tempel teks, gambar, atau PDF — kita bantu cerna, sesantai apapun ritmenya
            </p>
          </div>
        </div>

        {/* ── Input Area ── */}
        <AnimatePresence mode="wait">
          {state === 'idle' || state === 'error' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="omni-input-block"
            >
              {/* Drop Zone */}
              <DropZone
                onText={processText}
                onImage={processImage}
                onPdf={processPdf}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
              />

              <div className="omni-divider">
                <span>atau ketik / tempel teks di sini</span>
              </div>

              {/* Text paste area */}
              <div className="omni-textarea-wrap">
                <textarea
                  ref={textareaRef}
                  id="omnifocus-text-input"
                  className="omni-textarea"
                  placeholder="Tempel artikel, catatan, email, atau apapun yang ingin kamu cerna... Tidak ada tekanan, mulai dari mana aja."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={6}
                />
                <motion.button
                  id="omnifocus-process-btn"
                  className="omni-btn omni-btn-primary"
                  onClick={() => processText(rawText)}
                  disabled={!rawText.trim()}
                  whileTap={{ scale: 0.97 }}
                >
                  <IconBoldText size={16} />
                  Baca dengan Bionic Reading
                </motion.button>
              </div>

              {state === 'error' && statusMsg && (
                <div className="omni-error">{statusMsg}</div>
              )}
            </motion.div>
          ) : state === 'loading' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="omni-loading"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              >
                <IconRefresh size={30} />
              </motion.div>
              <p>{statusMsg || 'Memproses...'}</p>
            </motion.div>
          ) : (
            /* ── Reader View ── */
            <motion.div
              key="reader"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              {/* Toolbar */}
              <div className="omni-toolbar">
                {/* Left: controls */}
                <div className="omni-toolbar-left">
                  {/* Font size */}
                  <div className="omni-tool-group">
                    <button
                      className="omni-tool-btn"
                      onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                      aria-label="Kecilkan teks"
                      title="A-"
                    >
                      A<sup style={{ fontSize: '8px' }}>-</sup>
                    </button>
                    <span className="omni-tool-sep">{fontSize}px</span>
                    <button
                      className="omni-tool-btn"
                      onClick={() => setFontSize((s) => Math.min(28, s + 1))}
                      aria-label="Besarkan teks"
                      title="A+"
                    >
                      A<sup style={{ fontSize: '8px' }}>+</sup>
                    </button>
                  </div>

                  {/* Bionic toggle */}
                  <button
                    className={`omni-tool-btn omni-tool-toggle ${bionicEnabled ? 'active' : ''}`}
                    onClick={() => setBionicEnabled((v) => !v)}
                    title="Toggle Bionic Reading"
                  >
                    <span style={{ fontWeight: 900, fontSize: '13px' }}>
                      <b>B</b>ionic
                    </span>
                  </button>
                </div>

                {/* Right: actions */}
                <div className="omni-toolbar-right">
                  <button
                    className="omni-tool-btn"
                    onClick={handleCleanText}
                    disabled={isCleaning}
                    title="Rapikan format teks (spasi, tabel) dengan AI"
                  >
                    {isCleaning ? (
                      <>
                        <motion.span
                          className="omni-inline-icon"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <IconRefresh size={13} />
                        </motion.span>
                        Merapikan...
                      </>
                    ) : (
                      <><IconSparkles size={13} /> Rapikan Teks</>
                    )}
                  </button>
                  <button className="omni-tool-btn omni-tool-ghost" onClick={handleClear} title="Input baru">
                    <IconX size={13} /> Baru
                  </button>
                </div>
              </div>

              {/* Image preview */}
              {imageDataUrl && inputMode === 'image' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="omni-image-preview"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageDataUrl} alt="Uploaded" className="omni-image-thumb" />
                  <p className="omni-image-caption">Gambar diunggah — Gemini Vision membaca isinya di bawah</p>
                </motion.div>
              )}

              {/* ── Bionic Text Reader ── */}
              <div
                ref={readerRef}
                id="omnifocus-reader-content"
                className="omni-reader"
                style={{ fontSize: `${fontSize}px` }}
                dangerouslySetInnerHTML={bionicEnabled ? { __html: bionicHtml } : undefined}
              >
                {!bionicEnabled ? rawText : undefined}
              </div>

              {/* ── Action Bar ── */}
              <div className="omni-action-bar">
                {/* Summarize */}
                <motion.button
                  id="omnifocus-summarize-btn"
                  className="omni-action-btn omni-action-primary"
                  onClick={handleSummarize}
                  disabled={isSummarizing || !rawText.trim()}
                  whileTap={{ scale: 0.97 }}
                >
                  {isSummarizing ? (
                    <>
                      <motion.span
                        className="omni-inline-icon"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <IconRefresh size={15} />
                      </motion.span>
                      Merangkum...
                    </>
                  ) : (
                    <><IconSparkles size={15} /> Rangkum 3–5 Poin</>
                  )}
                </motion.button>

                {/* TTS */}
                <motion.button
                  id="omnifocus-tts-btn"
                  className={`omni-action-btn ${isTalking ? 'omni-action-active' : 'omni-action-secondary'}`}
                  onClick={handleTts}
                  disabled={!rawText.trim()}
                  whileTap={{ scale: 0.97 }}
                >
                  {isTalking ? <><IconPause size={15} /> Pause</> : <><IconVolume size={15} /> Dengarkan</>}
                </motion.button>

                {/* Text-to-Video */}
                <motion.button
                  id="omnifocus-video-btn"
                  className="omni-action-btn omni-action-video"
                  onClick={handleTextToVideo}
                  disabled={isVideoQueued || !rawText.trim()}
                  whileTap={{ scale: 0.97 }}
                  title="Ubah teks menjadi video (sambungkan API)"
                >
                  {isVideoQueued ? (
                    <>
                      <motion.span
                        className="omni-inline-icon"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <IconRefresh size={15} />
                      </motion.span>
                      Mengirim...
                    </>
                  ) : (
                    <><IconClapperboard size={15} /> Ubah ke Video</>
                  )}
                </motion.button>
              </div>

              {/* Status message */}
              <AnimatePresence>
                {statusMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="omni-status"
                  >
                    <IconInfo size={15} /> {statusMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Video result card */}
              <AnimatePresence>
                {videoResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="omni-video-card"
                  >
                    <div className="omni-video-header">
                      <span className="omni-video-icon"><IconClapperboard size={18} /></span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--omni-accent-text)' }}>
                          Video {videoResult.status === 'completed' ? 'Siap' : 'Sedang Diproses'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--omni-muted)' }}>
                          Job ID: {videoResult.jobId}
                        </div>
                      </div>
                    </div>
                    {videoResult.videoUrl ? (
                      <video
                        className="omni-video-player"
                        src={videoResult.videoUrl}
                        controls
                        playsInline
                      />
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--omni-muted)', margin: 0 }}>
                        Video sedang dibuat, tunggu sebentar ya.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Summary Panel ── */}
              <AnimatePresence>
                {showSummary && summary && summary.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="omni-summary"
                  >
                    <div className="omni-summary-header">
                      <div className="omni-summary-title">
                        <IconSparkles size={16} />
                        Ringkasan Bite-Sized
                      </div>
                      <button
                        className="omni-summary-close"
                        onClick={() => setShowSummary(false)}
                        aria-label="Tutup ringkasan"
                      >
                        <IconX size={13} />
                      </button>
                    </div>
                    <ul className="omni-summary-list">
                      {summary.map((point, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="omni-summary-item"
                        >
                          <span
                            className="omni-summary-chip"
                            style={{ background: SUMMARY_CHIP_COLORS[i % SUMMARY_CHIP_COLORS.length] }}
                          >
                            {i + 1}
                          </span>
                          <span className="omni-summary-text">{point.text}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty hint ── */}
        {state === 'idle' && !hasContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="omni-hint"
          >
            <IconLightbulb size={14} />
            <span>Tips: Bionic Reading menebalkan awal setiap kata untuk mengunci fokus mata — cocok untuk otak ADHD yang sering mind-wandering saat membaca.</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
