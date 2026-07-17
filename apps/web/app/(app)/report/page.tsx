'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStorage } from '../../../hooks/useStorage';
import { genId } from '../../../lib/storage';
import { useLang } from '../../../contexts/providers';
import { translations } from '../../../lib/i18n';
import {
  IconFileText, IconAlertTriangle, IconCheck, IconCopy,
  IconUser, IconMessageCircle, IconLock, IconClock, IconCalendar, IconArrowRight,
} from '../../../components/Icons';
import styles from './report.module.css';

interface ApiPsychologist {
  id: string;
  display_name: string;
  photo_url: string | null;
  price_per_session_idr: number;
}

interface PsychologistVisuals {
  id: string;
  badgeColor: string;
  photo?: string;
}

const PSYCHOLOGISTS: PsychologistVisuals[] = [
  { id: 'p1', badgeColor: '#10B981', photo: 'https://i.pravatar.cc/150?u=sarah' },
  { id: 'p2', badgeColor: '#6366F1', photo: 'https://i.pravatar.cc/150?u=budi' },
  { id: 'p3', badgeColor: '#F59E0B', photo: 'https://i.pravatar.cc/150?u=amanda' },
  { id: 'p4', badgeColor: '#10B981', photo: 'https://i.pravatar.cc/150?u=reza' },
];

export default function ReportPage() {
  const [store, update] = useStorage();
  const { lang } = useLang();
  const tr = translations[lang];

  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState<{ tier: string; limit: number } | null>(null);
  const [realPsychologists, setRealPsychologists] = useState<ApiPsychologist[]>([]);
  const [bookedPsychIds, setBookedPsychIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/psychologists')
      .then((r) => (r.ok ? r.json() : { psychologists: [] }))
      .then((data) => setRealPsychologists(data.psychologists ?? []))
      .catch(() => setRealPsychologists([]));

    // Chat only makes sense once you've actually booked a session with
    // that psychologist — otherwise there's no session context to chat about.
    fetch('/api/bookings')
      .then((r) => (r.ok ? r.json() : { bookings: [] }))
      .then((data) => {
        const ids = (data.bookings ?? [])
          .filter((b: { status: string; psychologist: { id: string } | null }) => (b.status === 'confirmed' || b.status === 'completed') && b.psychologist)
          .map((b: { psychologist: { id: string } }) => b.psychologist.id);
        setBookedPsychIds(new Set(ids));
      })
      .catch(() => {});
  }, []);

  const profile = store.profile;
  const tasks = store.tasks;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const rsdEvents = store.rsdEvents;
  const moodLog = store.moodLog;
  const avgEnergy =
    moodLog.length > 0
      ? moodLog.slice(-14).reduce((s, m) => s + m.energyLevel, 0) / Math.min(14, moodLog.length)
      : store.currentEnergy;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setQuotaExceeded(null);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { name: profile?.name || 'Pengguna', interests: profile?.interests || [] },
          taskCount: tasks.length,
          completedTaskCount: completedTasks.length,
          rsdEvents: rsdEvents.map((e) => ({
            triggers: e.triggers,
            energyLevel: e.energyLevel,
            timestamp: e.timestamp,
          })),
          avgEnergy,
          contextSwitchCount: store.contextSwitches.length,
          timeEstimates: store.timeEstimates,
        }),
      });
      if (res.status === 402) {
        const info = await res.json();
        setQuotaExceeded({ tier: info.tier, limit: info.limit });
        return;
      }
      if (!res.ok) throw new Error(`report_api_${res.status}`);
      const data = await res.json();
      setReport(data.report);
      // The server ledger (xp_ledger/profiles.total_xp) is now the source of
      // truth for gating, but the local store still drives the existing
      // dashboard XP bar — add the same delta there so it stays in sync.
      update((prev) => ({
        ...prev,
        totalXP: prev.totalXP + data.xpAwarded,
        xpHistory: [...prev.xpHistory, { id: genId(), amount: data.xpAwarded, reason: 'Report generated 📊', timestamp: new Date().toISOString() }],
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container-md">

        {/* Header */}
        <div className={styles.header}>
          <div className="icon-box icon-box--lg" style={{ background: '#F3F4F6', color: '#4B5563' }}>
            <IconFileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{tr.report.title}</h1>
            <p className="text-sub mt-2">{tr.report.desc}</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className={`card ${styles.disclaimer}`}>
          <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
            <IconAlertTriangle size={20} />
          </span>
          <p className="text-sm font-medium">{tr.report.disclaimer}</p>
        </div>

        {/* ── Section 1: Generate Laporan ─────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>
            <span className={styles.sectionDot} style={{ background: '#6366F1' }} />
            {tr.report.section_clinical}
          </div>

          {quotaExceeded && (
            <div className="card" style={{ marginBottom: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#92400E' }}>
                {lang === 'id'
                  ? `Kuota Laporan Klinis bulan ini (${quotaExceeded.limit}x, paket ${quotaExceeded.tier}) sudah habis.`
                  : `This month's Clinical Report quota (${quotaExceeded.limit}x, ${quotaExceeded.tier} plan) is used up.`}
              </span>
              <Link href="/pricing" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                Upgrade
              </Link>
            </div>
          )}

          <div className={styles.generateCard}>
            <button
              className="btn btn-primary btn-xl btn-full"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" />
                  {tr.report.generating}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <IconFileText size={16} /> {tr.report.generate_btn}
                </span>
              )}
            </button>
            <p className={styles.generateHint}>{tr.report.generate_hint}</p>
          </div>

          {/* Report Output */}
          {report && (
            <div className={`card ${styles.reportCard} animate-in`}>
              <div className={styles.reportHeader}>
                <h3 className="font-extrabold text-lg">{tr.report.report_title}</h3>
                <button className="btn btn-outline btn-sm" onClick={handleCopy}>
                  <span className="flex items-center gap-2">
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    {copied ? tr.common.copied : tr.common.copy}
                  </span>
                </button>
              </div>
              <div
                className={styles.reportContent}
                dangerouslySetInnerHTML={{
                  __html: report
                    .replace(
                      /## (.*)/g,
                      '<h3 style="font-weight:800;color:var(--color-text);margin:16px 0 8px">$1</h3>'
                    )
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(
                      /^- (.*)/gm,
                      '<li style="margin-left:16px;margin-bottom:4px;color:var(--color-text)">$1</li>'
                    )
                    .replace(/\n/g, '<br/>'),
                }}
              />
            </div>
          )}
        </section>

        {/* ── Section 2: Pilih Psikolog ──────────────────────────── */}
        <section className={styles.section}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className={styles.sectionLabel}>
              <span className={styles.sectionDot} style={{ background: '#8B5CF6' }} />
              {tr.report.psikolog_title}
            </div>
            <Link href="/my-sessions" className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
              <IconCalendar size={14} /> {lang === 'id' ? 'Riwayat Booking' : 'Booking History'} <IconArrowRight size={12} />
            </Link>
          </div>

          <p className={styles.psikologIntro}>
            {tr.report.psikolog_desc}
          </p>

          <div className={styles.psikologGrid}>
            {tr.report.psychologists.map((psiText, index) => {
              const psiVis = PSYCHOLOGISTS[index] || PSYCHOLOGISTS[0]!;
              const real = realPsychologists[index];
              const href = real ? `/psychologists/${real.id}` : '/psychologists';
              const isBooked = !!real && bookedPsychIds.has(real.id);
              return (
              <Link
                key={psiText.id}
                href={href}
                className={styles.psikologCard}
              >
                {/* Avatar + name row */}
                <div className={styles.psikologTop}>
                  <div className={styles.psikologAvatar}>
                    {psiVis.photo ? (
                      <img src={psiVis.photo} alt={psiText.name} className={styles.psikologImg} />
                    ) : (
                      <IconUser size={20} />
                    )}
                  </div>
                  <div className={styles.psikologInfo}>
                    <div className={styles.psikologNameRow}>
                      <span className={styles.psikologName}>{psiText.name}</span>
                      <span
                        className={styles.psikologBadge}
                        style={{ background: psiVis.badgeColor }}
                      >
                        {psiText.badge}
                      </span>
                    </div>
                    <div className={styles.psikologSpecialty}>{psiText.specialty}</div>
                  </div>
                </div>

                {/* Approach */}
                <p className={styles.psikologApproach}>{psiText.approach}</p>

                {/* Footer */}
                <div className={styles.psikologFooter}>
                  <span className={styles.psikologAvail}>
                    <IconClock size={12} />
                    {psiText.available}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className={`btn btn-sm ${isBooked ? 'btn-outline' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!isBooked) return;
                        alert('Chat feature is a mockup');
                      }}
                      disabled={!isBooked}
                      title={isBooked ? tr.report.chat : (lang === 'id' ? 'Booking sesi dulu buat bisa chat' : 'Book a session first to chat')}
                      style={{
                        fontSize: '13px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6,
                        ...(isBooked ? {} : { background: 'var(--color-border)', color: 'var(--color-text-muted)', border: 'none', cursor: 'not-allowed' }),
                      }}
                    >
                      {isBooked ? <IconMessageCircle size={13} /> : <IconLock size={12} />}
                      {isBooked ? tr.report.chat : (lang === 'id' ? 'Booking dulu' : 'Book first')}
                    </button>
                    <span className={styles.psikologCta}>
                      {tr.report.contact}
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
