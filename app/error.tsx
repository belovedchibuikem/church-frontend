'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main style={{ padding: 48, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <h1 style={{ fontSize: 24 }}>This page could not load</h1>
      <p style={{ color: '#555' }}>Try again, or go back to the home page.</p>
      <p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </p>
    </main>
  );
}
