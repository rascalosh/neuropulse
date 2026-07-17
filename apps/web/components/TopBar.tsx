'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStorage } from '../hooks/useStorage';
import { useLang } from '../contexts/providers';
import { translations } from '../lib/i18n';
import { IconActivity, IconMoon, IconUser, IconChevronDown, IconLogOut } from './Icons';
import styles from './TopBar.module.css';

export default function TopBar() {
  const [store, updateStore] = useStorage();
  const { lang, setLang } = useLang();
  const tr = translations[lang];
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirmLogout = async () => {
    try {
      const { createClient } = await import('../utils/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();

      const { clearStore } = await import('../lib/storage');
      clearStore();

      setShowLogoutConfirm(false);
      window.location.href = '/login';
    } catch (err) {
      console.error('Error logging out:', err);
    }
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

      <div className={styles.langToggle} role="group" aria-label="Language switcher">
        <button
          className={`${styles.langBtn} ${lang === 'id' ? styles.langActive : ''}`}
          onClick={() => setLang('id')}
          aria-pressed={lang === 'id'}
          lang="id"
        >
          ID
        </button>
        <button
          className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`}
          onClick={() => setLang('en')}
          aria-pressed={lang === 'en'}
          lang="en"
        >
          EN
        </button>
      </div>

      <div className={styles.profileMenu} ref={menuRef}>
        <button
          type="button"
          className={styles.profileTrigger}
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className={styles.avatar} aria-hidden="true">
            {store.profile?.avatar || <IconUser size={15} />}
          </span>
          <span className={styles.profileName}>{store.profile?.name || 'User'}</span>
          <IconChevronDown size={13} className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ''}`} />
        </button>

        {menuOpen && (
          <div className={styles.dropdown} role="menu">
            <Link href="/profile" className={styles.dropdownItem} role="menuitem" onClick={() => setMenuOpen(false)}>
              <IconUser size={14} /> {lang === 'id' ? 'Edit Profil' : 'Edit Profile'}
            </Link>
            <button
              type="button"
              className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
              role="menuitem"
              onClick={() => { setMenuOpen(false); setShowLogoutConfirm(true); }}
            >
              <IconLogOut size={14} /> {lang === 'id' ? 'Keluar' : 'Log out'}
            </button>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconWrap}>
                <IconLogOut size={22} />
              </div>
              <h2 id="logout-title" className={styles.modalTitle}>
                {lang === 'id' ? 'Keluar dari NeuroPulse?' : 'Log out of NeuroPulse?'}
              </h2>
            </div>
            <p className={styles.modalBody}>
              {lang === 'id'
                ? 'Semua sesi fokus yang sedang berjalan akan dihentikan. Anda harus masuk kembali untuk mengakses data Anda.'
                : 'Any active focus sessions will be stopped. You will need to log back in to access your data.'}
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnCancel} onClick={() => setShowLogoutConfirm(false)}>
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button type="button" className={styles.modalBtnConfirm} onClick={handleConfirmLogout}>
                {lang === 'id' ? 'Keluar' : 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
