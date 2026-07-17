'use client';
import { useState } from 'react';
import { useStorage } from '../../../hooks/useStorage';
import { generateNakesReport } from '../../../lib/gemini';
import { XP_REWARDS } from '../../../lib/gamification';
import { genId } from '../../../lib/storage';
import { useLang } from '../../../contexts/providers';
import { translations } from '../../../lib/i18n';
import {
  IconFileText, IconAlertTriangle, IconCheck, IconCopy,
} from '../../../components/Icons';
import styles from './report.module.css';

interface PsychologistVisuals {
  id: string;
  badgeColor: string;
  emoji: string;
  photo?: string;
}

const PSYCHOLOGISTS: PsychologistVisuals[] = [
  {
    id: 'p1',
    badgeColor: '#10B981',
    photo: 'https://i.pravatar.cc/150?u=sarah',
    emoji: '👩‍⚕️',
  },
  {
    id: 'p2',
    badgeColor: '#6366F1',
    photo: 'https://i.pravatar.cc/150?u=budi',
    emoji: '👨‍⚕️',
  },
  {
    id: 'p3',
    badgeColor: '#F59E0B',
    photo: 'https://i.pravatar.cc/150?u=amanda',
    emoji: '👩‍⚕️',
  },
  {
    id: 'p4',
    badgeColor: '#10B981',
    photo: 'https://i.pravatar.cc/150?u=reza',
    emoji: '👨‍⚕️',
  },
];

export default function ReportPage() {
  const [store, update] = useStorage();
  const { lang } = useLang();
  const tr = translations[lang];

  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

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
    try {
      const text = await generateNakesReport({
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
      });
      setReport(text);
      update((prev) => ({
        ...prev,
        totalXP: prev.totalXP + XP_REWARDS.REPORT_GENERATED,
        xpHistory: [
          ...prev.xpHistory,
          {
            id: genId(),
            amount: XP_REWARDS.REPORT_GENERATED,
            reason: 'Report generated 📊',
            timestamp: new Date().toISOString(),
          },
        ],
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

  const handleSendReport = (e: React.MouseEvent, psiId: string) => {
    e.preventDefault();
    if (!report) {
      alert(tr.report.generate_first);
      return;
    }
    setSendingTo(psiId);
    setTimeout(() => {
      setSendingTo(null);
      setSentTo(psiId);
      setTimeout(() => setSentTo(null), 3000);
    }, 1500);
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
          <div className={styles.sectionLabel}>
            <span className={styles.sectionDot} style={{ background: '#8B5CF6' }} />
            {tr.report.psikolog_title}
          </div>

          <p className={styles.psikologIntro}>
            {tr.report.psikolog_desc}
          </p>

          <div className={styles.psikologGrid}>
            {tr.report.psychologists.map((psiText, index) => {
              const psiVis = PSYCHOLOGISTS[index] || PSYCHOLOGISTS[0]!;
              return (
              <a
                key={psiText.id}
                href="#"
                onClick={(e) => handleSendReport(e, psiText.id)}
                className={styles.psikologCard}
              >
                {/* Avatar + name row */}
                <div className={styles.psikologTop}>
                  <div className={styles.psikologAvatar}>
                    {psiVis.photo ? (
                      <img src={psiVis.photo} alt={psiText.name} className={styles.psikologImg} />
                    ) : (
                      psiVis.emoji
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
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    {psiText.available}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={(e) => { e.preventDefault(); alert("Chat feature is a mockup"); }}
                      style={{ fontSize: '13px', padding: '6px 14px' }}
                    >
                      {tr.report.chat}
                    </button>
                    <span className={styles.psikologCta}>
                      {sendingTo === psiText.id ? (
                        <span className="flex items-center gap-1"><span className="spinner" style={{width: 12, height: 12, borderWidth: 2}}></span> {tr.report.sending}</span>
                      ) : sentTo === psiText.id ? (
                        <span style={{ color: '#10B981' }} className="flex items-center gap-1"><IconCheck size={12} /> {tr.report.sent}</span>
                      ) : (
                        <>
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
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </a>
            );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
