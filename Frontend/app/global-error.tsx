'use client';

// Catches errors thrown by the root layout itself — app/error.tsx can't, since it renders
// *inside* that layout. Must render its own <html>/<body>; no design-system fonts/providers
// are guaranteed to be available here, so this stays deliberately plain.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#fcf9f5', color: '#1c1c1a' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '32px', fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: '#56423e', maxWidth: '400px' }}>That&apos;s on us, not you — try again in a moment.</p>
          <button
            onClick={reset}
            style={{
              background: '#9f402d',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
