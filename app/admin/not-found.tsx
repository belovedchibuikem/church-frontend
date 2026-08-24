import Link from 'next/link';

export default function AdminNotFound() {
  return <main className="state-page"><div className="shield-lock">?</div><h1>Page not found</h1><p>The requested administrative route does not exist or is not discoverable in this scope.</p><Link className="primary-button link-button" href="/admin">Back to Dashboard</Link></main>;
}
