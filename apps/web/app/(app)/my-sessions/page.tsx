'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '../../../contexts/providers';
import { IconCalendar } from '../../../components/Icons';

interface Booking {
  id: string;
  status: string;
  is_free_session: boolean;
  price_idr: number;
  payment_status: string;
  psychologist: { id: string; display_name: string; photo_url: string | null } | null;
  slot: { start_at: string; end_at: string } | null;
}

export default function MySessionsPage() {
  const { lang } = useLang();
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    fetch('/api/bookings')
      .then((r) => (r.ok ? r.json() : { bookings: [] }))
      .then((data) => setBookings(data.bookings ?? []))
      .catch(() => setBookings([]));
  }, []);

  const statusLabel = (b: Booking) => {
    if (b.status === 'confirmed') return lang === 'id' ? 'Terkonfirmasi' : 'Confirmed';
    if (b.status === 'cancelled') return lang === 'id' ? 'Dibatalkan' : 'Cancelled';
    if (b.status === 'completed') return lang === 'id' ? 'Selesai' : 'Completed';
    return lang === 'id' ? 'Menunggu pembayaran' : 'Awaiting payment';
  };

  return (
    <div className="container-md">
      <div className="flex items-center gap-3 mt-6 mb-2">
        <div className="icon-box icon-box--lg" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
          <IconCalendar size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">{lang === 'id' ? 'Sesi Saya' : 'My Sessions'}</h1>
          <p className="text-sub mt-2">{lang === 'id' ? 'Riwayat booking sesi psikolog kamu.' : 'Your psychologist booking history.'}</p>
        </div>
      </div>

      <div className="mt-6" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bookings === null && <p className="text-sub">{lang === 'id' ? 'Memuat...' : 'Loading...'}</p>}
        {bookings?.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <p className="text-sub">{lang === 'id' ? 'Belum ada sesi. Yuk booking psikolog pertama kamu.' : "No sessions yet. Book your first psychologist session."}</p>
            <Link href="/psychologists" className="btn btn-primary mt-4">{lang === 'id' ? 'Cari Psikolog' : 'Find a Psychologist'}</Link>
          </div>
        )}
        {bookings?.map((b) => (
          <div key={b.id} className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="font-bold">{b.psychologist?.display_name ?? '—'}</div>
              <div className="text-xs text-sub">
                {b.slot ? new Date(b.slot.start_at).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="text-sm font-bold">{b.is_free_session ? (lang === 'id' ? 'Gratis' : 'Free') : `Rp${b.price_idr.toLocaleString('id-ID')}`}</div>
              <div className="text-xs text-sub">{statusLabel(b)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
