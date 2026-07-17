'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { useLang } from '../../../contexts/providers';
import { TIERS, TIER_LIMITS, TIER_PRICE_IDR, TIER_DISCOUNT_PCT, TIER_MAX_FOCUS_MINUTES, type Tier } from '../../../lib/tiers';
import { IconCheck, IconStar, IconLeaf, IconZap, IconTrophy } from '../../../components/Icons';
import styles from './pricing.module.css';

const TIER_NAME: Record<Tier, { id: string; en: string }> = {
  free: { id: 'Gratis', en: 'Free' },
  murah: { id: 'Murah', en: 'Basic' },
  standar: { id: 'Standar', en: 'Standard' },
  mahal: { id: 'Mahal', en: 'Premium' },
};

const TIER_ICON: Record<Tier, typeof IconLeaf> = {
  free: IconLeaf,
  murah: IconZap,
  standar: IconStar,
  mahal: IconTrophy,
};

const TIER_COLOR: Record<Tier, { fg: string; bg: string }> = {
  free: { fg: '#059669', bg: '#D1FAE5' },
  murah: { fg: '#2563EB', bg: '#DBEAFE' },
  standar: { fg: '#7C3AED', bg: '#EDE9FE' },
  mahal: { fg: '#B45309', bg: '#FEF3C7' },
};

function limitLabel(n: number, unit: string, lang: 'id' | 'en') {
  if (n < 0) return lang === 'id' ? 'Tanpa batas' : 'Unlimited';
  return `${n}${unit}`;
}

export default function PricingPage() {
  const { lang } = useLang();
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);
  const [switching, setSwitching] = useState<Tier | null>(null);

  useEffect(() => {
    fetch('/api/profile/tier')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setCurrentTier(data.tier))
      .catch(() => {});
  }, []);

  const handleChoose = async (tier: Tier) => {
    setSwitching(tier);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      if (res.ok) setCurrentTier(tier);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className={`container-md ${styles.page}`}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><IconStar size={24} /></div>
        <div>
          <h1 className={styles.title}>{lang === 'id' ? '4 paket, mulai dari gratis' : '4 plans, starting free'}</h1>
          <p className={styles.desc}>
            {lang === 'id'
              ? 'Pembayaran sekarang masih simulasi (mock) — belum ada uang beneran yang ditarik.'
              : 'Payment is currently simulated (mock) — no real money is charged yet.'}
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier;
          const isHighlight = tier === 'standar';
          const Icon = TIER_ICON[tier];
          const color = TIER_COLOR[tier];
          return (
            <div
              key={tier}
              className={`${styles.card} ${isHighlight ? styles.cardHighlight : ''}`}
              style={{ '--tier-color': color.fg, '--tier-bg': color.bg } as CSSProperties}
            >
              {isHighlight && (
                <span className={styles.badge}>{lang === 'id' ? 'Paling populer' : 'Most popular'}</span>
              )}
              <div className={styles.tierIcon}><Icon size={20} /></div>
              <h2 className={styles.tierName}>{TIER_NAME[tier][lang]}</h2>
              <p className={styles.price}>
                {tier === 'free' ? (lang === 'id' ? 'Rp0' : '$0') : `Rp${TIER_PRICE_IDR[tier].toLocaleString('id-ID')}`}
                <span className={styles.pricePeriod}> {tier === 'free' ? (lang === 'id' ? '/selamanya' : '/forever') : (lang === 'id' ? '/bulan' : '/month')}</span>
              </p>
              <ul className={styles.features}>
                <li><IconCheck size={13} className={styles.checkIcon} /> Task Decomposer {limitLabel(TIER_LIMITS[tier].task_decompose, 'x/bln', lang)}</li>
                <li><IconCheck size={13} className={styles.checkIcon} /> Bionic Reading {limitLabel(TIER_LIMITS[tier].bionic_reading, 'x/bln', lang)}</li>
                <li><IconCheck size={13} className={styles.checkIcon} /> {lang === 'id' ? 'Laporan Klinis' : 'Clinical Report'} {limitLabel(TIER_LIMITS[tier].clinical_report, 'x/bln', lang)}</li>
                <li><IconCheck size={13} className={styles.checkIcon} /> Focus Mirror {lang === 'id' ? 'maks' : 'up to'} {TIER_MAX_FOCUS_MINUTES[tier]} min</li>
                <li>
                  <IconCheck size={13} className={styles.checkIcon} />
                  {tier === 'free'
                    ? (lang === 'id' ? 'Sesi psikolog pertama gratis' : 'First psychologist session free')
                    : `${lang === 'id' ? 'Diskon sesi psikolog' : 'Psychologist session discount'} ${TIER_DISCOUNT_PCT[tier]}%`}
                </li>
                {tier === 'mahal' && (
                  <li><IconStar size={13} className={styles.checkIcon} /> {lang === 'id' ? '1 sesi psikolog gratis/bulan' : '1 free psychologist session/month'}</li>
                )}
              </ul>
              <button
                className={`${styles.chooseBtn} ${isHighlight ? styles.chooseBtnFilled : styles.chooseBtnOutline}`}
                onClick={() => handleChoose(tier)}
                disabled={isCurrent || switching !== null}
              >
                {isCurrent ? <IconCheck size={15} /> : null}
                {isCurrent
                  ? (lang === 'id' ? 'Paket aktif' : 'Current plan')
                  : switching === tier
                  ? (lang === 'id' ? 'Memproses...' : 'Processing...')
                  : (lang === 'id' ? 'Pilih paket ini' : 'Choose this plan')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
