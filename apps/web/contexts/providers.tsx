'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Lang } from '../lib/i18n';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangCtx>({ lang: 'id', setLang: () => {} });
export const useLang = () => useContext(LangContext);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('id');

  useEffect(() => {
    const stored = localStorage.getItem('np_lang') as Lang | null;
    if (stored === 'id' || stored === 'en') setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('np_lang', l);
    document.documentElement.lang = l;
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

/* ---------- Accessibility Context ---------- */
interface A11ySettings {
  fontSize: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  reduceMotion: boolean;
  bionic: boolean;
  tts: boolean;
}

interface A11yCtx extends A11ySettings {
  setFontSize: (s: A11ySettings['fontSize']) => void;
  toggleContrast: () => void;
  toggleMotion: () => void;
  toggleBionic: () => Promise<void>;
  toggleTts: () => void;
  bionicQuotaExceeded: { tier: string; limit: number } | null;
}

const A11yContext = createContext<A11yCtx>({
  fontSize: 'normal',
  highContrast: false,
  reduceMotion: false,
  bionic: false,
  tts: false,
  setFontSize: () => {},
  toggleContrast: () => {},
  toggleMotion: () => {},
  toggleBionic: async () => {},
  toggleTts: () => {},
  bionicQuotaExceeded: null,
});
export const useA11y = () => useContext(A11yContext);

export function A11yProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<A11ySettings['fontSize']>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [bionic, setBionic] = useState(false);
  const [tts, setTts] = useState(false);
  const [bionicQuotaExceeded, setBionicQuotaExceeded] = useState<{ tier: string; limit: number } | null>(null);

  useEffect(() => {
    const s = localStorage.getItem('np_a11y');
    if (s) {
      try {
        const saved: A11ySettings = { bionic: false, tts: false, ...JSON.parse(s) };
        apply(saved);
        setFontSizeState(saved.fontSize);
        setHighContrast(saved.highContrast);
        setReduceMotion(saved.reduceMotion);
        setBionic(saved.bionic);
        setTts(saved.tts);
      } catch { /* ignore */ }
    }
    // Respect OS preference for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduceMotion(true);
      document.documentElement.setAttribute('data-motion', 'reduced');
    }
  }, []);

  function apply(s: A11ySettings) {
    const html = document.documentElement;
    html.setAttribute('data-fontsize', s.fontSize === 'normal' ? '' : s.fontSize);
    html.setAttribute('data-contrast', s.highContrast ? 'high' : '');
    html.setAttribute('data-motion', s.reduceMotion ? 'reduced' : '');
    html.setAttribute('data-bionic', s.bionic ? 'on' : '');
    html.setAttribute('data-tts', s.tts ? 'on' : '');
  }

  function save(s: A11ySettings) {
    localStorage.setItem('np_a11y', JSON.stringify(s));
    apply(s);
  }

  const current = (): A11ySettings => ({ fontSize, highContrast, reduceMotion, bionic, tts });

  const setFontSize = (fs: A11ySettings['fontSize']) => {
    setFontSizeState(fs);
    save({ ...current(), fontSize: fs });
  };

  const toggleContrast = () => {
    setHighContrast(!highContrast);
    save({ ...current(), highContrast: !highContrast });
  };

  const toggleMotion = () => {
    setReduceMotion(!reduceMotion);
    save({ ...current(), reduceMotion: !reduceMotion });
  };

  const toggleBionic = async () => {
    // Turning OFF is always free; turning ON counts against the monthly
    // bionic-reading quota, checked server-side (Supabase RLS/RPC), since
    // the tier itself lives outside client-editable localStorage.
    if (bionic) {
      setBionic(false);
      save({ ...current(), bionic: false });
      return;
    }
    try {
      const res = await fetch('/api/bionic/check', { method: 'POST' });
      const data = await res.json();
      if (!data.allowed) {
        setBionicQuotaExceeded({ tier: data.tier, limit: data.limit });
        return;
      }
      setBionicQuotaExceeded(null);
      setBionic(true);
      save({ ...current(), bionic: true });
    } catch {
      // Offline / API unavailable — fail open so accessibility isn't blocked by a network hiccup.
      setBionic(true);
      save({ ...current(), bionic: true });
    }
  };

  const toggleTts = () => {
    setTts(!tts);
    save({ ...current(), tts: !tts });
  };

  return (
    <A11yContext.Provider value={{ fontSize, highContrast, reduceMotion, bionic, tts, setFontSize, toggleContrast, toggleMotion, toggleBionic, toggleTts, bionicQuotaExceeded }}>
      {children}
    </A11yContext.Provider>
  );
}
