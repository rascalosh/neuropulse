'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useLang } from '../../../../contexts/providers';
import { IconArrowLeft, IconCheck, IconUser, IconCalendar, IconClock, IconStar } from '../../../../components/Icons';
import { TIER_DISCOUNT_PCT, type Tier } from '../../../../lib/tiers';
import styles from './detail.module.css';

interface Psychologist {
  id: string;
  display_name: string;
  photo_url: string | null;
  bio: string | null;
  specialties: string[];
  price_per_session_idr: number;
}

interface Slot {
  id: string;
  start_at: string;
  end_at: string;
}

type BookingResult = { bookingId: string; isFreeSession: boolean; priceIdr: number; status: string };

export default function PsychologistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const [psychologist, setPsychologist] = useState<Psychologist | null>(null);
  const [availability, setAvailability] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('free');
  const [freeSessionUsed, setFreeSessionUsed] = useState(true);

  useEffect(() => {
    fetch(`/api/psychologists/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setPsychologist(data.psychologist);
        setAvailability(data.availability ?? []);
      })
      .catch(() => {});

    fetch('/api/profile/tier')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setTier(data.tier);
        setFreeSessionUsed(data.freeSessionUsed);
      })
      .catch(() => {});
  }, [id]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setIsBooking(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilityId: selectedSlot }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? data.error ?? 'booking_failed');
        return;
      }
      setBooking(data);
      setAvailability((prev) => prev.filter((s) => s.id !== selectedSlot));
    } finally {
      setIsBooking(false);
    }
  };

  const handlePay = async () => {
    if (!booking) return;
    setIsPaying(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.bookingId }),
      });
      if (res.ok) {
        setBooking((prev) => (prev ? { ...prev, status: 'confirmed' } : prev));
      }
    } finally {
      setIsPaying(false);
    }
  };

  if (!psychologist) {
    return <div className="container-md mt-6"><p className="text-sub">{lang === 'id' ? 'Memuat...' : 'Loading...'}</p></div>;
  }

  // Group open slots by calendar day so the picker reads as "Sen 20 Jul" → time chips,
  // instead of one long flat list of full datetimes.
  const dayGroups = availability.reduce<{ label: string; slots: Slot[] }[]>((acc, slot) => {
    const label = new Date(slot.start_at).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    const group = acc.find((g) => g.label === label);
    if (group) group.slots.push(slot);
    else acc.push({ label, slots: [slot] });
    return acc;
  }, []);

  const discountPct = TIER_DISCOUNT_PCT[tier];

  return (
    <div className="container-md mt-6" style={{ paddingBottom: 24 }}>
      <Link href="/psychologists" className={styles.back}>
        <IconArrowLeft size={14} /> {lang === 'id' ? 'Kembali' : 'Back'}
      </Link>

      <div className={`card mt-4 ${styles.profileCard}`}>
        {psychologist.photo_url ? (
          <img src={psychologist.photo_url} alt={psychologist.display_name} className={styles.avatar} />
        ) : (
          <div className={styles.avatarFallback}><IconUser size={26} /></div>
        )}
        <div>
          <h1 className={styles.name}>{psychologist.display_name}</h1>
          {psychologist.specialties.length > 0 && (
            <div className={styles.specialtyRow}>
              {psychologist.specialties.map((s) => (
                <span key={s} className={styles.specialtyChip}>{s}</span>
              ))}
            </div>
          )}
          {psychologist.bio && <p className={styles.bio}>{psychologist.bio}</p>}
          <div className={styles.priceRow}>
            {!freeSessionUsed ? (
              <span className={styles.priceFree}><IconStar size={14} /> {lang === 'id' ? 'Sesi pertama gratis' : 'First session free'}</span>
            ) : discountPct > 0 ? (
              <>
                <span className={styles.priceStruck}>Rp{psychologist.price_per_session_idr.toLocaleString('id-ID')}</span>
                <span className={styles.priceNow}>
                  Rp{Math.round(psychologist.price_per_session_idr * (100 - discountPct) / 100).toLocaleString('id-ID')}/sesi
                </span>
                <span className={styles.discountTag}>{lang === 'id' ? 'diskon' : 'discount'} {discountPct}% · {tier}</span>
              </>
            ) : (
              <span className={styles.priceNow}>Rp{psychologist.price_per_session_idr.toLocaleString('id-ID')}/sesi</span>
            )}
          </div>
        </div>
      </div>

      {booking ? (
        <div className={`card mt-4 ${styles.successCard}`}>
          <div className={styles.successIcon}><IconCheck size={24} /></div>
          <h2 className="text-lg font-extrabold mt-4">
            {booking.status === 'confirmed'
              ? (lang === 'id' ? 'Sesi terkonfirmasi!' : 'Session confirmed!')
              : (lang === 'id' ? 'Booking dibuat' : 'Booking created')}
          </h2>
          <p className="text-sm text-sub mt-2">
            {booking.isFreeSession
              ? (lang === 'id' ? 'Sesi pertamamu gratis' : 'Your first session is free')
              : `Rp${booking.priceIdr.toLocaleString('id-ID')}`}
          </p>
          {booking.status !== 'confirmed' && (
            <button className="btn btn-primary mt-4" onClick={handlePay} disabled={isPaying}>
              {isPaying ? (lang === 'id' ? 'Memproses...' : 'Processing...') : (lang === 'id' ? 'Bayar Sekarang' : 'Pay Now')}
            </button>
          )}
          <div className="mt-4">
            <Link href="/my-sessions" className="flex items-center justify-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
              {lang === 'id' ? 'Lihat sesi saya' : 'View my sessions'} <IconArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} />
            </Link>
          </div>
        </div>
      ) : (
        <div className={`card mt-4 ${styles.pickerCard}`}>
          <h2 className={styles.pickerTitle}><IconCalendar size={16} /> {lang === 'id' ? 'Pilih jadwal' : 'Pick a time slot'}</h2>
          {error && <p className="text-sm mb-3" style={{ color: 'var(--color-danger, #DC2626)' }}>{error}</p>}
          {dayGroups.length === 0 ? (
            <div className={styles.emptyState}>
              <IconCalendar size={22} />
              {lang === 'id' ? 'Belum ada jadwal tersedia.' : 'No slots available yet.'}
            </div>
          ) : (
            dayGroups.map((group) => (
              <div key={group.label} className={styles.dayGroup}>
                <div className={styles.dayLabel}><IconCalendar size={12} /> {group.label}</div>
                <div className={styles.timeGrid}>
                  {group.slots.map((slot) => (
                    <button
                      key={slot.id}
                      className={`${styles.timeChip} ${selectedSlot === slot.id ? styles.timeChipActive : ''}`}
                      onClick={() => setSelectedSlot(slot.id)}
                    >
                      <IconClock size={12} />
                      {new Date(slot.start_at).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
          <div className={styles.bookBar}>
            <button className="btn btn-primary btn-full" onClick={handleBook} disabled={!selectedSlot || isBooking}>
              {isBooking ? (lang === 'id' ? 'Memesan...' : 'Booking...') : (lang === 'id' ? 'Pesan Sesi' : 'Book Session')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
