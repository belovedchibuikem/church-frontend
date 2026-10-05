'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequestData } from '@/lib/api-client';

type Recommendation = {
  status?: string;
  applicant_name?: string | null;
  recommender_name?: string | null;
};

export function KcaLeaderRecommendation({ token }: { token: string }) {
  const [record, setRecord] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void apiRequestData<Recommendation>(`kca/recommendations/${token}`)
      .then((data) => {
        if (!cancelled) setRecord(data);
      })
      .catch(() => {
        if (!cancelled) setError('This recommendation link is not valid.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await apiRequestData(`kca/recommendations/${token}`, {
        method: 'POST',
        bootstrapCsrf: false,
        body: JSON.stringify({
          recommender_name: String(form.get('recommender_name') ?? ''),
          recommender_role: String(form.get('recommender_role') ?? ''),
          recommender_phone: String(form.get('recommender_phone') ?? ''),
          statement: String(form.get('statement') ?? ''),
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The recommendation could not be sent.');
    } finally {
      setBusy(false);
    }
  }

  const applicant = record?.applicant_name || 'this applicant';

  return (
    <article className="card" style={{ maxWidth: 640, margin: '2rem auto' }}>
      <h1>Church leader recommendation</h1>
      <p>
        Kingdom Change Agents asked you to recommend {applicant}. The student does not write this recommendation.
        Add your name and a short note, then send it to KCA.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {done || record?.status === 'submitted' || record?.status === 'verified' ? (
        <p>Thank you. KCA has your recommendation.</p>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)}>
          <label>
            <span>Your name</span>
            <input name="recommender_name" required placeholder="Pastor Jane Doe" />
          </label>
          <label>
            <span>Your role</span>
            <input name="recommender_role" placeholder="Pastor" />
          </label>
          <label>
            <span>Phone</span>
            <input name="recommender_phone" placeholder="+234" />
          </label>
          <label>
            <span>Recommendation</span>
            <textarea name="statement" required rows={5} placeholder="How do you know this person, and why do you recommend them for KCA?" />
          </label>
          <button className="primary-button" type="submit" disabled={busy || !record}>
            {busy ? 'Sending…' : 'Send recommendation'}
          </button>
        </form>
      )}
    </article>
  );
}
