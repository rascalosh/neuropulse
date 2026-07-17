export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      width: '100%',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}>
        <div className="spinner spinner--blue" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
        <p style={{
          color: 'var(--color-text-sub)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
        }}>Memuat...</p>
      </div>
    </div>
  );
}
