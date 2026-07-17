'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStore } from '../lib/storage';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const store = getStore();
    if (store.profile?.onboardingCompleted) {
      router.replace('/dashboard');
    } else {
      router.replace('/onboarding');
    }
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div className="text-center animate-fade">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
        <p style={{ color: 'var(--color-text-sub)', fontWeight: 600 }}>Memuat NeuroPulse...</p>
      </div>
    </div>
  );
}
