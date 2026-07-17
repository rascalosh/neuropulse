'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import { getStore } from '../../lib/storage';
import Nav from '../../components/Nav';
import TopBar from '../../components/TopBar';
import CompanionChatbot from '../../components/CompanionChatbot';
import styles from './layout.module.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const checkAuthAndOnboarding = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!data.user) {
        router.replace('/login');
        return;
      }

      const store = getStore();
      const onboardingCompleted = !!store.profile?.onboardingCompleted;

      if (!onboardingCompleted) {
        router.replace('/onboarding');
      } else {
        setLoading(false);
      }
    };

    checkAuthAndOnboarding();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Nav />
      <div className={styles.mainWrap}>
        <TopBar />
        <main className={styles.main}>{children}</main>
      </div>
      <CompanionChatbot />
    </div>
  );
}
