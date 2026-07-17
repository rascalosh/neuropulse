'use client';
import { useState } from 'react';
import { useLang } from '../../../contexts/providers';
import { translations } from '../../../lib/i18n';
import { IconFileText, IconMonitor, IconMessageCircle, IconUser, IconPlay, IconSearch, IconArrowRight } from '../../../components/Icons';
import styles from './bodydouble.module.css';

const ROOMS = [
  {
    key: 'deadline', Icon: IconFileText, iconBg: '#EFF6FF', iconColor: '#3B82F6', online: 8,
    avatars: [
      { initial: 'A', bg: '#8B5CF6' },
      { initial: 'K', bg: '#3B82F6' },
    ],
  },
  {
    key: 'remote', Icon: IconMonitor, iconBg: '#F5F3FF', iconColor: '#8B5CF6', online: 12,
    avatars: [
      { initial: 'M', bg: '#F59E0B' },
      { initial: 'J', bg: '#6366F1' },
    ],
  },
  {
    key: 'study', Icon: IconMessageCircle, iconBg: '#ECFDF5', iconColor: '#10B981', online: 5,
    avatars: [
      { initial: 'R', bg: '#EF4444' },
      { initial: 'S', bg: '#3B82F6' },
    ],
  },
] as const;

const YT_PRESETS = [
  { key: 'lofi', label: 'Lofi Girl — Study Radio', videoId: 'jfKfPfyJRdk' },
  { key: 'swm', label: 'Study With Me — Pomodoro', query: 'study with me pomodoro live' },
  { key: 'coffee', label: 'Coffee Shop Ambience', query: 'coffee shop ambience study with me' },
] as const;

function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1) || null;
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
      const liveMatch = url.pathname.match(/\/(live|embed)\/([a-zA-Z0-9_-]{11})/);
      if (liveMatch) return liveMatch[2] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export default function BodyDoublePage() {
  const { lang } = useLang();
  const tr = translations[lang];
  const [joining, setJoining] = useState(false);
  const [ytInput, setYtInput] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const handleLoadVideo = () => {
    const id = extractYoutubeId(ytInput);
    if (id) setActiveVideoId(id);
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div className="icon-box" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
            <IconUser size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{tr.bodydouble.title}</h1>
            <p className="text-sub mt-2">{tr.bodydouble.desc}</p>
          </div>
        </div>

        <div className="grid-3">
          {ROOMS.map((room) => {
            const info = tr.bodydouble.rooms[room.key];
            return (
              <div key={room.key} className={`card ${styles.roomCard}`}>
                <div className={styles.roomTop}>
                  <div className="icon-box icon-box--sm" style={{ background: room.iconBg, color: room.iconColor }}>
                    <room.Icon size={17} />
                  </div>
                  <span className={styles.onlineBadge}>
                    <span className={styles.onlineDot} /> {room.online} {tr.bodydouble.online}
                  </span>
                </div>
                <h3 className={styles.roomTitle}>{info.title}</h3>
                <p className={styles.roomDesc}>{info.desc}</p>
                <div className={styles.avatars}>
                  {room.avatars.map((a) => (
                    <span key={a.initial} className={styles.avatarChip} style={{ background: a.bg }}>{a.initial}</span>
                  ))}
                  <span className={`${styles.avatarChip} ${styles.avatarMore}`}>+</span>
                </div>
                <button className={`btn btn-primary btn-full mt-4 ${styles.joinRoomBtn}`} onClick={() => setJoining(true)}>
                  <IconArrowRight size={16} /> {tr.bodydouble.join_btn}
                </button>
              </div>
            );
          })}
        </div>

        <div className={styles.ytSection}>
          <div className={styles.ytHeader}>
            <div className="icon-box icon-box--sm" style={{ background: '#FEF2F2', color: '#EF4444' }}>
              <IconPlay size={16} />
            </div>
            <div>
              <h2 className={styles.ytTitle}>Study With Me — YouTube</h2>
              <p className={styles.ytDesc}>Putar video co-working YouTube sebagai teman kerja virtual.</p>
            </div>
          </div>

          <div className={styles.ytPresets}>
            {YT_PRESETS.map((preset) => (
              <button
                key={preset.key}
                className={styles.ytChip}
                onClick={() => {
                  if ('videoId' in preset) {
                    setActiveVideoId(preset.videoId);
                  } else {
                    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(preset.query)}`, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                {'videoId' in preset ? <IconPlay size={14} /> : <IconSearch size={14} />}
                {preset.label}
              </button>
            ))}
          </div>

          <div className={styles.ytInputRow}>
            <input
              className={styles.ytInput}
              type="text"
              placeholder="Tempel link atau ID video YouTube..."
              value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
            />
            <button className="btn btn-primary" onClick={handleLoadVideo}>Putar</button>
          </div>

          {activeVideoId && (
            <div className={`${styles.ytPlayer} animate-in`}>
              <iframe
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
                title="Study With Me"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {joining && (
          <div className={`${styles.joinBar} animate-in`}>
            <button className="btn btn-primary btn-lg" disabled>
              <IconUser size={16} /> {tr.bodydouble.joining}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
