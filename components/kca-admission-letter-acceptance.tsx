'use client';

import { useRef, useState, type FormEvent, type PointerEvent } from 'react';

import { useLocale } from '@/components/locale-provider';

type AcceptancePayload = {
  applicant_signature_name: string;
  guardian_name?: string;
  guardian_signature_name?: string;
  guardian_phone?: string;
};

export function KcaAdmissionLetterAcceptancePanel({
  applicantName,
  requiresGuardian,
  busy,
  onAccept,
}: {
  applicantName: string;
  requiresGuardian?: boolean;
  busy?: boolean;
  onAccept: (payload: AcceptancePayload) => Promise<void>;
}) {
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [typedSignature, setTypedSignature] = useState(applicantName);
  const [guardianName, setGuardianName] = useState('');
  const [guardianSignature, setGuardianSignature] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDraw = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => setDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!confirmed) {
      setError(t('member.kca.acceptanceRequired', { defaultMessage: 'Please confirm that you have read and accept the admission letter.' }));
      return;
    }
    const signature = typedSignature.trim();
    if (!signature) {
      setError(t('member.kca.signatureRequired', { defaultMessage: 'Please type or draw your signature.' }));
      return;
    }
    try {
      await onAccept({
        applicant_signature_name: signature,
        guardian_name: requiresGuardian ? guardianName.trim() || undefined : undefined,
        guardian_signature_name: requiresGuardian ? guardianSignature.trim() || undefined : undefined,
        guardian_phone: requiresGuardian ? guardianPhone.trim() || undefined : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic', { defaultMessage: 'Something went wrong.' }));
    }
  };

  return (
    <form className="card kca-letter-acceptance" onSubmit={(event) => void submit(event)}>
      <h2>{t('member.kca.acceptAdmission', { defaultMessage: 'Accept admission' })}</h2>
      <p className="maps-settings-lead">
        {t('member.kca.acceptAdmissionCopy', {
          defaultMessage: 'Read the letter above carefully, then sign below to confirm your acceptance.',
        })}
      </p>
      <label>
        <span>{t('member.kca.typedSignature', { defaultMessage: 'Type your full name as signature' })}</span>
        <input onChange={(event) => setTypedSignature(event.target.value)} required value={typedSignature} />
      </label>
      <label>
        <span>{t('member.kca.drawSignature', { defaultMessage: 'Or draw your signature (optional)' })}</span>
        <canvas
          ref={canvasRef}
          className="kca-signature-canvas"
          height={120}
          onPointerDown={startDraw}
          onPointerLeave={endDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          width={420}
        />
        <button className="ghost-button" onClick={clearSignature} type="button">
          {t('common.clear', { defaultMessage: 'Clear' })}
        </button>
      </label>
      {requiresGuardian ? (
        <>
          <label>
            <span>{t('member.kca.guardianName', { defaultMessage: 'Parent/Guardian name' })}</span>
            <input onChange={(event) => setGuardianName(event.target.value)} value={guardianName} />
          </label>
          <label>
            <span>{t('member.kca.guardianSignature', { defaultMessage: 'Parent/Guardian signature (typed)' })}</span>
            <input onChange={(event) => setGuardianSignature(event.target.value)} value={guardianSignature} />
          </label>
          <label>
            <span>{t('member.kca.guardianPhone', { defaultMessage: 'Parent/Guardian phone' })}</span>
            <input onChange={(event) => setGuardianPhone(event.target.value)} value={guardianPhone} />
          </label>
        </>
      ) : null}
      <label className="kca-letter-acceptance-check">
        <input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
        <span>{t('member.kca.acceptTerms', { defaultMessage: 'I have read and accept this admission letter and commit to participate faithfully.' })}</span>
      </label>
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <button className="primary-button" disabled={busy} type="submit">
        {t('member.kca.acceptAndSign', { defaultMessage: 'I accept and sign' })}
      </button>
    </form>
  );
}
