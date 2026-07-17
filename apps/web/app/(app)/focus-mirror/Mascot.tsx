'use client';
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Mascot.module.css';

export type MascotMood = 'idle' | 'focus' | 'drowsy' | 'away' | 'reward';

interface MascotProps {
  mood: MascotMood;
  message?: string | null;
  visible?: boolean;
}

export interface MascotHandle {
  openPip: () => Promise<void>;
}

interface DocumentPictureInPicture {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

const MOOD_COPY: Record<MascotMood, { text: string; hex: string }> = {
  focus: { text: 'Tetap Fokus!', hex: '#2563EB' },
  drowsy: { text: 'Ayo bangun!', hex: '#F59E0B' },
  away: { text: 'Ayo fokus lagi!', hex: '#EF4444' },
  reward: { text: 'Kerja Bagus!', hex: '#10B981' },
  idle: { text: 'Siap menemanimu!', hex: '#64748B' },
};

const BUDDY_SRC = '/mascot-buddy.png';

function MascotBubble({ display, message }: { display: { text: string; hex: string }; message?: string | null }) {
  return (
    <div className={styles.bubble}>
      <div className={styles.bubbleTitle} style={{ color: display.hex }}>{display.text}</div>
      {message && <div className={styles.bubbleMessage}>{message}</div>}
      <div className={styles.bubbleTail} />
    </div>
  );
}

function MascotDockContent({ mood, message, visible }: MascotProps) {
  const display = MOOD_COPY[mood];
  return (
    <div className={styles.dock}>
      {visible && <MascotBubble display={display} message={message} />}
      <img
        src={BUDDY_SRC}
        alt="Maskot NeuroPulse"
        className={`${styles.buddyImg} ${visible ? styles.buddyActive : styles.buddyIdle}`}
      />
    </div>
  );
}

// Isi window Document PiP — full window & center, beda dari MascotDockContent yang
// nempel di pojok halaman biasa.
function MascotPipContent({ mood, message, visible }: MascotProps) {
  const display = MOOD_COPY[mood];
  return (
    <div className={styles.pipDock}>
      {visible && (
        <div className={styles.pipBubble}>
          <div className={styles.pipBubbleTitle} style={{ color: display.hex }}>{display.text}</div>
          {message && <div className={styles.pipBubbleMessage}>{message}</div>}
        </div>
      )}
      <img
        src={BUDDY_SRC}
        alt="Maskot NeuroPulse"
        className={`${styles.pipBuddyImg} ${visible ? styles.buddyActive : styles.buddyIdle}`}
      />
    </div>
  );
}

// Nyalin semua stylesheet dokumen utama ke dalam window PiP baru, biar class dari
// Mascot.module.css (dan CSS variable --space-*/--color-* dari globals.css) tetap kepakai.
function copyStylesInto(pipWindow: Window) {
  [...document.styleSheets].forEach((sheet) => {
    try {
      const rules = [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
      const style = pipWindow.document.createElement('style');
      style.textContent = rules;
      pipWindow.document.head.appendChild(style);
    } catch {
      if (sheet.href) {
        const link = pipWindow.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        pipWindow.document.head.appendChild(link);
      }
    }
  });
  pipWindow.document.body.style.margin = '0';
  // Force light theme in the PiP window regardless of the OS/browser dark
  // mode preference — our globals.css has a `prefers-color-scheme: dark`
  // media query that only backs off when `data-theme="light"` is set on
  // <html>, and this popup's own <html> never inherits that attribute from
  // the main page. Without this the bubble silently goes dark-mode navy.
  pipWindow.document.documentElement.setAttribute('data-theme', 'light');
  pipWindow.document.body.style.background = '#ffffff';
}

const Mascot = forwardRef<MascotHandle, MascotProps>(function Mascot({ mood, message, visible = false }, ref) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [docPipSupported, setDocPipSupported] = useState(false);

  useEffect(() => {
    setDocPipSupported(typeof window !== 'undefined' && 'documentPictureInPicture' in window);
  }, []);

  const openPip = async () => {
    if (!docPipSupported || !window.documentPictureInPicture) {
      alert('Browser kamu belum mendukung Picture-in-Picture. Coba gunakan Chrome/Edge terbaru.');
      return;
    }
    try {
      // Window PiP beneran (bukan video) — bisa di-drag-resize normal kayak window
      // biasa, dan isinya HTML/CSS asli (bukan gambar canvas), jadi gak pernah buram.
      const win = await window.documentPictureInPicture.requestWindow({ width: 220, height: 240 });
      copyStylesInto(win);
      win.addEventListener('pagehide', () => setPipWindow(null), { once: true });
      setPipWindow(win);
    } catch (e) {
      console.warn('Gagal membuka PiP:', e);
    }
  };

  useImperativeHandle(ref, () => ({ openPip }));

  if (pipWindow) {
    return createPortal(
      <MascotPipContent mood={mood} message={message} visible={visible} />,
      pipWindow.document.body
    );
  }

  return (
    <>
      {docPipSupported && (
        <button onClick={openPip} className={styles.pipButton}>
          Buka Maskot Pop-out
        </button>
      )}
      <MascotDockContent mood={mood} message={message} visible={visible} />
    </>
  );
});

export default Mascot;
