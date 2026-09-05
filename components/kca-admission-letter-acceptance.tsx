'use client';

import { useState, type FormEvent } from 'react';

import { useLocale } from '@/components/locale-provider';
import { SignaturePad } from '@/components/signature-pad';
import { formatUserApiError, storeUserFile } from '@/lib/user-api';

type AcceptancePayload = {
  applicant_signature_name: string;
  applicant_signature_file_asset_id?: string;
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
  const [typedSignature, setTypedSignature] = useState(applicantName);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [guardianName, setGuardianName] = useState('');
  const [guardianSignature, setGuardianSignature] = useState('');
  const [guardianDrawnSignature, setGuardianDrawnSignature] = useState<string | null>(null);
  const [guardianPhone, setGuardianPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const uploadSignatureBlob = async (blob: Blob, filename: string): Promise<string> => {
    const formData = new FormData();
    formData.set('purpose', 'kca.admission_signature');
    formData.set('classification', 'restricted');
    formData.set('file', blob, filename);
    const asset = await storeUserFile(formData);
    const id = `${asset.id ?? asset.public_id ?? ''}`.trim();
    if (!id) {
      throw new Error('Signature upload succeeded but did not return an asset id.');
    }
    return id;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!confirmed) {
      setError(t('member.kca.acceptanceRequired', { defaultMessage: 'Please confirm that you have read and accept the admission letter.' }));
      return;
    }
    const signature = typedSignature.trim() || applicantName.trim();
    if (!signature) {
      setError(t('member.kca.signatureRequired', { defaultMessage: 'Please type or draw your signature.' }));
      return;
    }
    if (requiresGuardian && !guardianSignature.trim() && !guardianDrawnSignature) {
      setError(t('member.kca.guardianSignatureRequired', { defaultMessage: 'Provide parent/guardian signature (typed or drawn).' }));
      return;
    }

    try {
      setUploading(true);
      let applicantSignatureFileAssetId: string | undefined;
      if (drawnSignature) {
        const signatureBlob = await dataUrlToBlob(drawnSignature);
        applicantSignatureFileAssetId = await uploadSignatureBlob(signatureBlob, 'kca-admission-signature.png');
      }

      await onAccept({
        applicant_signature_name: signature,
        applicant_signature_file_asset_id: applicantSignatureFileAssetId,
        guardian_name: requiresGuardian ? guardianName.trim() || undefined : undefined,
        guardian_signature_name: requiresGuardian
          ? (guardianSignature.trim() || guardianName.trim() || undefined)
          : undefined,
        guardian_phone: requiresGuardian ? guardianPhone.trim() || undefined : undefined,
      });
    } catch (err) {
      setError(formatUserApiError(err, t('errors.generic', { defaultMessage: 'Something went wrong.' })));
    } finally {
      setUploading(false);
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
        <span>{t('member.kca.drawSignature', { defaultMessage: 'Draw your signature' })}</span>
        <SignaturePad disabled={busy || uploading} onChange={setDrawnSignature} />
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
            <span>{t('member.kca.drawGuardianSignature', { defaultMessage: 'Or draw parent/guardian signature' })}</span>
            <SignaturePad disabled={busy || uploading} onChange={setGuardianDrawnSignature} />
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
      <button className="primary-button" disabled={busy || uploading} type="submit">
        {t('member.kca.acceptAndSign', { defaultMessage: 'I accept and sign' })}
      </button>
    </form>
  );
}
