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

// Isi window Document PiP — full window & center. Bubble judul selalu tampil
// (nunjukin mood saat ini) supaya window gak keliatan kosong/blank di antara
// trigger event; `visible` cuma nentuin apakah lagi "pulsing" (bounce sebentar)
// vs idle mengambang biasa.
function MascotPipContent({ mood, visible }: MascotProps) {
  const display = MOOD_COPY[mood];
  return (
    <div className={styles.pipDock}>
      <div className={styles.pipBubble}>
        <div className={styles.pipBubbleTitle} style={{ color: display.hex }}>{display.text}</div>
      </div>
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

// Drives --pip-vmin (the smaller of the popup's own width/height, in px) so
// the mascot/text can scale off an explicit JS-updated value instead of
// trusting vmin/vw/vh to recompute inside this separate window — some
// browsers are inconsistent about re-resolving viewport units live inside a
// Document PiP window's own document, so we force it via a resize listener.
function watchPipSize(pipWindow: Window): () => void {
  const update = () => {
    const vmin = Math.min(pipWindow.innerWidth, pipWindow.innerHeight);
    pipWindow.document.documentElement.style.setProperty('--pip-vmin', `${vmin}px`);
  };
  update();
  pipWindow.addEventListener('resize', update);
  return () => pipWindow.removeEventListener('resize', update);
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
      // Bigger default than the bare minimum so text/mascot aren't cramped —
      // still a real OS window, so the user can freely resize (bigger, smaller,
      // or flattened) afterwards and the content below scales with vmin units.
      const win = await window.documentPictureInPicture.requestWindow({ width: 320, height: 340 });
      copyStylesInto(win);
      const stopWatching = watchPipSize(win);
      win.addEventListener('pagehide', () => {
        stopWatching();
        setPipWindow(null);
      }, { once: true });
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

  // Nothing to render outside the PiP window — no docked corner widget (it
  // covered CompanionChatbot) and no manual "open popup" button (opening is
  // automatic via openPip() when the focus session starts, see page.tsx).
  return null;
});

export default Mascot;
