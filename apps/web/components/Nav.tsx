'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStorage } from '../hooks/useStorage';
import { getLevelInfo } from '../lib/gamification';
import { getMascotSrc } from '../lib/mascot';
import { useLang } from '../contexts/providers';
import { translations } from '../lib/i18n';
import {
  IconGrid, IconCheckSquare, IconGift, IconHeart,
  IconFileText, IconMenu, IconFlame, IconUser,
  IconMessageCircle, IconEye, IconSparkles, IconLogOut,
} from './Icons';
import styles from './Nav.module.css';

interface NavItem {
  href: string;
  key: string;
  Icon: typeof IconGrid;
  showTaskBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', key: 'home', Icon: IconGrid },
  { href: '/energy-checkin', key: 'energycheckin', Icon: IconHeart },
  { href: '/tasks', key: 'tasks', Icon: IconCheckSquare, showTaskBadge: true },
  { href: '/focus-mirror', key: 'focusmirror', Icon: IconEye },
  { href: '/omnifocus', key: 'omnifocus', Icon: IconSparkles },
  { href: '/dopamine', key: 'dopamine', Icon: IconGift },
  { href: '/body-double', key: 'bodydouble', Icon: IconMessageCircle },
  { href: '/report', key: 'report', Icon: IconFileText },
];

export default function Nav() {
  const pathname = usePathname();
  const [store] = useStorage();
  const { lang, setLang } = useLang();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const tr = translations[lang];
  const levelInfo = getLevelInfo(store.totalXP);
  const activeTaskCount = store.tasks.filter((t) => t.status === 'active').length;

  if (!mounted) return null;

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header className={styles.mobileHeader}>
        <button
          className={styles.menuBtn}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <IconMenu size={20} />
        </button>
        <Link href="/dashboard" className={styles.brand} aria-label="NeuroPulse home">
          <div className={styles.brandIcon} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className={styles.brandLogo} />
          </div>
          <span className={styles.brandName}>NeuroPulse</span>
        </Link>
        <div className={styles.mobileRight}>
          {store.streak > 0 && (
            <div className={styles.streak} aria-label={`${store.streak} day streak`}>
              <IconFlame size={13} /> {store.streak}
            </div>
          )}
          <div className={styles.avatar} aria-label={`${store.profile?.name || 'User'} avatar`}>
            {store.profile?.avatar || <IconUser size={16} />}
          </div>
        </div>
      </header>

      {/* ── Mobile nav overlay ── */}
      {mobileOpen && (
        <div className={styles.mobileNavWrap} role="dialog" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const label = tr.nav[item.key as keyof typeof tr.nav];
            const active = pathname === item.href;
            const { Icon } = item;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.mobileChip} ${active ? styles.mobileChipActive : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            className={`${styles.mobileChip} ${styles.mobileLogoutChip}`}
            onClick={() => setShowLogoutConfirm(true)}
            aria-label={lang === 'id' ? 'Keluar' : 'Log out'}
          >
            <IconLogOut size={15} />
            {lang === 'id' ? 'Keluar' : 'Log out'}
          </button>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className={styles.sidebar} aria-label="Main navigation">
        <Link href="/dashboard" className={styles.brand} aria-label="NeuroPulse home">
          <div className={styles.brandIcon} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className={styles.brandLogo} />
          </div>
          <div>
            <div className={styles.brandName}>NeuroPulse</div>
            <div className={styles.brandTag}>{lang === 'id' ? 'Kerja bareng otakmu' : 'Work with your brain'}</div>
          </div>
        </Link>

        <nav className={styles.navScroll}>
          {NAV_ITEMS.map((item) => {
            const label = tr.nav[item.key as keyof typeof tr.nav];
            const active = pathname === item.href;
            const { Icon } = item;
            const badge = item.showTaskBadge && activeTaskCount > 0 ? activeTaskCount : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navActive : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.navIcon} aria-hidden="true"><Icon size={18} /></span>
                <span className={styles.navLabel}>{label}</span>
                {badge !== null && <span className={styles.navBadge}>{badge}</span>}
                {active && badge === null && <span className={styles.navActiveDot} aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          {/* Energy Now widget */}
          <div className={styles.energyNowCard}>
            <div className={styles.energyNowLabel}>{lang === 'id' ? 'ENERGI SEKARANG' : 'ENERGY NOW'}</div>
            <div className={styles.energyNowRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getMascotSrc(store.currentEnergy)} alt="" className={styles.energyNowMascot} />
              <div className={styles.energyNowText}>
                <div className={styles.energyNowName}>{tr.energy[String(store.currentEnergy) as keyof typeof tr.energy].label}</div>
                <div className={styles.energyNowDesc}>{tr.energy[String(store.currentEnergy) as keyof typeof tr.energy].desc}</div>
              </div>
            </div>
            <div className={styles.energyNowTrack}>
              <div className={styles.energyNowFill} style={{ width: `${store.currentEnergy * 20}%` }} />
            </div>
          </div>

          {/* Language toggle */}
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

          <div className={styles.profileRow}>
            <Link
              href="/profile"
              className={styles.profileLink}
              aria-label={lang === 'id' ? 'Edit profil' : 'Edit profile'}
              title={lang === 'id' ? 'Edit profil' : 'Edit profile'}
            >
              <div className={styles.avatar} aria-hidden="true">
                {store.profile?.avatar || <IconUser size={16} />}
              </div>
              <div className={styles.profileInfo}>
                <div className={styles.profileName}>{store.profile?.name || 'User'}</div>
                <div className={styles.profileLevel}>{tr.levels[levelInfo.level as keyof typeof tr.levels]} level</div>
              </div>
            </Link>
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={() => setShowLogoutConfirm(true)}
              aria-label={lang === 'id' ? 'Keluar' : 'Log out'}
              title={lang === 'id' ? 'Keluar' : 'Log out'}
            >
              <IconLogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconWrap}>
                <IconLogOut size={24} className={styles.modalLogOutIcon} />
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
              <button 
                type="button" 
                className={styles.modalBtnCancel} 
                onClick={() => setShowLogoutConfirm(false)}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button 
                type="button" 
                className={styles.modalBtnConfirm} 
                onClick={handleConfirmLogout}
              >
                {lang === 'id' ? 'Keluar' : 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
