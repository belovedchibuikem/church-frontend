'use client';

export default function AdminError({ reset }: { reset: () => void }) {
  return <main className="state-page"><div className="shield-lock error-mark">!</div><h1>Unable to load this page</h1><p>The request could not be completed safely. Try again or contact support with the correlation reference.</p><button className="primary-button" onClick={reset}>Try Again</button></main>;
}
