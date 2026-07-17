'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStorage } from '../hooks/useStorage';
import { checkTaskDecay } from '../lib/storage';
import { useLang } from '../contexts/providers';
import { translations } from '../lib/i18n';
import { IconActivity, IconBell, IconMoon } from './Icons';
import styles from './TopBar.module.css';

export default function TopBar() {
  const [store, updateStore] = useStorage();
  const { lang } = useLang();
  const tr = translations[lang];
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('neuropulse-theme');
    const initial = saved === 'dark' ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('neuropulse-theme', next);
  };

  useEffect(() => {
    async function syncSupabaseUser() {
      try {
        const { createClient } = await import('../utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
          if (!store.profile || store.profile.name !== fullName) {
            updateStore((prev) => ({
              ...prev,
              profile: {
                name: fullName,
                avatar: prev.profile?.avatar || '🧠',
                interests: prev.profile?.interests || [],
                interestKeywords: prev.profile?.interestKeywords || [],
                onboardingCompleted: prev.profile?.onboardingCompleted ?? false,
                createdAt: prev.profile?.createdAt || new Date().toISOString(),
              },
            }));
          }
        }
      } catch (err) {
        console.error('Error syncing Supabase user profile to store:', err);
      }
    }

    if (mounted) {
      syncSupabaseUser();
    }
  }, [mounted, store.profile, updateStore]);

  if (!mounted) return null;

  const energy = String(store.currentEnergy) as keyof typeof tr.energy;
  const energyLabel = tr.energy[energy];
  const decayingCount = store.tasks.filter((t) => t.status === 'active' && checkTaskDecay(t)).length;

  return (
    <header className={styles.topbar}>
      <div className={styles.spacer} />

      <a href="/dashboard#energy-checkin" className={styles.energyPill}>
        <IconActivity size={15} />
        <span>{energyLabel.label}</span>
        <span className={styles.recheck}>{lang === 'id' ? 'Cek ulang' : 'Recheck'}</span>
      </a>

      <button type="button" className={styles.themePill} onClick={toggleTheme} aria-pressed={theme === 'dark'}>
        <IconMoon size={15} />
        <span>{theme === 'dark' ? (lang === 'id' ? 'Gelap' : 'Dark') : (lang === 'id' ? 'Terang' : 'Light')}</span>
      </button>

      <a href="/tasks" className={styles.bellBtn} aria-label="Notifications">
        <IconBell size={17} />
        {decayingCount > 0 && <span className={styles.bellDot} />}
      </a>
    </header>
  );
}

