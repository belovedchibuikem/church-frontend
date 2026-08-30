'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import {
  fetchCurrentLivestream,
  fetchLivestreamComments,
  postLivestreamComment,
  reactToLivestream,
  type Livestream,
  type LivestreamComment,
} from '@/lib/livestream-api';
import { formatUserApiError, isRecentMfaRequiredError } from '@/lib/user-api';
import { publicErrorMessage } from '@/lib/site-api';

function formatChatTime(value?: string | null): string {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function LiveWatchExperience() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<Livestream | null>(null);
  const [comments, setComments] = useState<LivestreamComment[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchCurrentLivestream()
      .then((next) => {
        if (cancelled) return;
        setStream(next);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setStream(null);
        setError(publicErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = stream?.id;
    if (!id) return;
    let cancelled = false;
    const load = () => {
      void fetchLivestreamComments(id)
        .then((items) => {
          if (!cancelled) {
            setComments(items);
            setChatError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setChatError(formatUserApiError(err, 'Sign in to join live chat.'));
        });
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [stream?.id]);

  async function onSend(event: FormEvent) {
    event.preventDefault();
    const id = stream?.id;
    const body = message.trim();
    if (!id || !body || busy) return;
    setBusy(true);
    try {
      const created = await postLivestreamComment(id, body);
      setComments((prev) => [...prev, created]);
      setMessage('');
      setChatError(null);
    } catch (err) {
      setChatError(
        isRecentMfaRequiredError(err)
          ? formatUserApiError(err, 'Recent MFA is required.')
          : formatUserApiError(err, 'Unable to send chat message.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onReact() {
    const id = stream?.id;
    if (!id) return;
    try {
      const result = await reactToLivestream(id);
      setStream((prev) =>
        prev ? { ...prev, reaction_count: result.reaction_count ?? prev.reaction_count } : prev,
      );
    } catch {
      /* reactions are optional */
    }
  }

  if (loading) return <p className="panel">Loading live service…</p>;
  if (error) return <p className="panel">{error}</p>;
  if (!stream) {
    return (
      <section className="panel">
        <h3>No live service right now</h3>
        <p>When a service goes live, it will appear here with video and chat.</p>
        <Link className="site-button" href="/online-church/sermons">
          Browse sermons
        </Link>
      </section>
    );
  }

  const live = (stream.status ?? '').toLowerCase() === 'live';

  return (
    <div className="live-watch-layout">
      <section className="panel live-player-panel">
        <div className="live-player-meta">
          <span className={live ? 'live' : 'status'}>{live ? '● LIVE' : (stream.status ?? 'scheduled').toUpperCase()}</span>
          <small>
            {stream.viewer_count ?? 0} watching · {stream.reaction_count ?? 0} reactions
          </small>
        </div>
        {stream.embed_url ? (
          <div className="live-embed">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              src={stream.embed_url}
              title={stream.title ?? 'Live service'}
            />
          </div>
        ) : null}
        <h2>{stream.title}</h2>
        <p>
          {[stream.church_name ?? stream.subtitle, stream.host_name].filter(Boolean).join(' · ')}
        </p>
        <div className="hero-actions">
          {stream.watch_url ? (
            <a className="site-button secondary" href={stream.watch_url} rel="noreferrer" target="_blank">
              Open on YouTube
            </a>
          ) : null}
          <Link className="site-button" href="/give">
            Give
          </Link>
          <Link className="site-button secondary" href="/account/prayer">
            Prayer
          </Link>
          <button className="site-button secondary" onClick={() => void onReact()} type="button">
            ♥ {stream.reaction_count ?? 0}
          </button>
        </div>
      </section>

      <section className="panel live-chat-panel">
        <h3>Live chat</h3>
        {chatError ? <p role="status">{chatError}</p> : null}
        <div className="live-chat-list">
          {comments.length === 0 ? <p>Be the first to share a word of faith.</p> : null}
          {comments.map((item) => (
            <div className="list-row" key={item.id ?? `${item.person_name}-${item.created_at}`}>
              <div>
                <b>{item.person_name ?? 'Member'}</b>
                <small>{item.body}</small>
              </div>
              <span>{formatChatTime(item.created_at)}</span>
            </div>
          ))}
        </div>
        <form className="live-chat-form" onSubmit={(event) => void onSend(event)}>
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a message..."
            maxLength={500}
          />
          <button className="site-button" disabled={busy || !message.trim()} type="submit">
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
