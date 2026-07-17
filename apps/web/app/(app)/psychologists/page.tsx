'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '../../../contexts/providers';
import { IconUsers, IconArrowRight, IconUser, IconStar } from '../../../components/Icons';
import { TIER_DISCOUNT_PCT, type Tier } from '../../../lib/tiers';

interface Psychologist {
  id: string;
  display_name: string;
  photo_url: string | null;
  bio: string | null;
  specialties: string[];
  price_per_session_idr: number;
}

export default function PsychologistsPage() {
  const { lang } = useLang();
  const [psychologists, setPsychologists] = useState<Psychologist[] | null>(null);
  const [tier, setTier] = useState<Tier>('free');
  const [freeSessionUsed, setFreeSessionUsed] = useState(true);

  useEffect(() => {
    fetch('/api/psychologists')
      .then((r) => (r.ok ? r.json() : { psychologists: [] }))
      .then((data) => setPsychologists(data.psychologists ?? []))
      .catch(() => setPsychologists([]));

    fetch('/api/profile/tier')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setTier(data.tier);
        setFreeSessionUsed(data.freeSessionUsed);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="container-md">
      <div className="flex items-center gap-3 mt-6 mb-2">
        <div className="icon-box icon-box--lg" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
          <IconUsers size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">{lang === 'id' ? 'Cari Psikolog' : 'Find a Psychologist'}</h1>
          <p className="text-sub mt-2">
            {lang === 'id'
              ? 'Sesi pertama gratis. Setelah itu, harga tergantung paketmu.'
              : 'Your first session is free. After that, price depends on your plan.'}
          </p>
        </div>
      </div>

      <div className="mt-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
        {psychologists === null && <p className="text-sub">{lang === 'id' ? 'Memuat...' : 'Loading...'}</p>}
        {psychologists?.length === 0 && <p className="text-sub">{lang === 'id' ? 'Belum ada psikolog tersedia.' : 'No psychologists available yet.'}</p>}
        {psychologists?.map((p) => (
          <Link
            key={p.id}
            href={`/psychologists/${p.id}`}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18, textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
          >
            <div className="flex items-center gap-3">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.display_name} width={46} height={46} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#EDE9FE', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconUser size={20} />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div className="font-bold text-sm">{p.display_name}</div>
                {p.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.specialties.slice(0, 2).map((s) => (
                      <span key={s} style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--gray-100)', color: 'var(--color-text-sub)' }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {p.bio && <p className="text-sm text-sub" style={{ margin: 0 }}>{p.bio}</p>}
            <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
              {!freeSessionUsed ? (
                <span className="text-sm font-bold flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                  <IconStar size={12} /> {lang === 'id' ? 'Sesi pertama gratis' : 'First session free'}
                </span>
              ) : TIER_DISCOUNT_PCT[tier] > 0 ? (
                <span className="text-sm font-bold">
                  <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', marginRight: 6, fontWeight: 500 }}>
                    Rp{p.price_per_session_idr.toLocaleString('id-ID')}
                  </span>
                  Rp{Math.round(p.price_per_session_idr * (100 - TIER_DISCOUNT_PCT[tier]) / 100).toLocaleString('id-ID')}/sesi
                </span>
              ) : (
                <span className="text-sm font-bold">Rp{p.price_per_session_idr.toLocaleString('id-ID')}/sesi</span>
              )}
              <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                {lang === 'id' ? 'Lihat jadwal' : 'View schedule'} <IconArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
