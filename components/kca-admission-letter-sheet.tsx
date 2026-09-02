'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export type KcaAdmissionLetterSheetData = {
  applicant_name: string;
  reference_code?: string | null;
  letter_body?: string | null;
  signer_name?: string | null;
  signer_title?: string | null;
  issued_at?: string | null;
  batch_label?: string | null;
  letterhead_file_asset_id?: string | null;
  signature_file_asset_id?: string | null;
};

type AssetResolver = (fileAssetId: string) => Promise<Blob>;

function useResolvedAsset(
  fileAssetId: string | null | undefined,
  resolveAsset?: AssetResolver,
): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!fileAssetId || !resolveAsset) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void resolveAsset(fileAssetId)
      .then((blob) => {
        if (cancelled || !blob.size) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileAssetId, resolveAsset]);

  return src;
}

function isStructuredTemplate(body: string): boolean {
  return body.length > 400 || body.includes('ADMISSION & ACCEPTANCE LETTER') || body.includes('YOUR KCA COMMITMENT');
}

function renderTemplateBlocks(body: string): ReactNode {
  return body.split('\n\n').filter(Boolean).map((block) => {
    const trimmed = block.trim();
    const isHeading = trimmed.length >= 8
      && trimmed === trimmed.toUpperCase()
      && !trimmed.includes(':')
      && /^[A-Z0-9 '&().-]+$/.test(trimmed);

    if (isHeading) {
      return <h3 className="kca-letter-section-title" key={trimmed}>{trimmed}</h3>;
    }

    return <p className="kca-letter-section-paragraph" key={trimmed}>{trimmed}</p>;
  });
}

export function KcaAdmissionLetterSheet({
  letter,
  resolveAsset,
  fallbackHeader,
  pendingReferenceLabel = 'Pending',
  admissionsTeamLabel = 'KCA Admissions Team',
  dearLabel = 'Dear',
  dateLabel,
  refLabel,
}: {
  letter: KcaAdmissionLetterSheetData;
  resolveAsset?: AssetResolver;
  fallbackHeader?: ReactNode;
  pendingReferenceLabel?: string;
  admissionsTeamLabel?: string;
  dearLabel?: string;
  dateLabel?: (date: string) => string;
  refLabel?: (ref: string) => string;
}) {
  const letterheadSrc = useResolvedAsset(letter.letterhead_file_asset_id, resolveAsset);
  const signatureSrc = useResolvedAsset(letter.signature_file_asset_id, resolveAsset);
  const hasLetterhead = Boolean(letterheadSrc || letter.letterhead_file_asset_id);
  const issuedOn = letter.issued_at
    ? new Date(letter.issued_at).toLocaleDateString()
    : new Date().toLocaleDateString();
  const reference = letter.reference_code ?? pendingReferenceLabel;
  const body = letter.letter_body ?? '';
  const bodyParagraphs = body.split('\n\n').filter(Boolean);
  const batchLabel = letter.batch_label ?? '';
  const structured = isStructuredTemplate(body);

  const defaultBody = batchLabel
    ? `We are pleased to inform you that you have been accepted into the Kingdom Citizens Academy for ${batchLabel}.`
    : 'We are pleased to inform you that you have been accepted into the Kingdom Citizens Academy.';

  if (hasLetterhead) {
    return (
      <article className="kca-letter kca-letter-composite" aria-label="Admission letter">
        <div className={`kca-letter-sheet${structured ? ' is-document' : ''}`}>
          {letterheadSrc ? (
            <img alt="" className="kca-letter-template-bg" src={letterheadSrc} />
          ) : (
            <div aria-hidden="true" className="kca-letter-template-bg kca-letter-template-placeholder" />
          )}
          <div className={`kca-letter-overlay${structured ? ' kca-letter-overlay--document' : ''}`}>
            {structured ? (
              <div className="kca-letter-document-scroll">
                {renderTemplateBlocks(body)}
                {signatureSrc ? (
                  <div className="kca-letter-signature-block">
                    <img
                      alt=""
                      className="kca-letter-signature-image"
                      src={signatureSrc}
                      style={{ maxHeight: 56, marginBottom: '0.35rem' } as CSSProperties}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="kca-letter-meta">
                  <span>{dateLabel ? dateLabel(issuedOn) : `Date: ${issuedOn}`}</span>
                  <span>{refLabel ? refLabel(reference) : `Ref: ${reference}`}</span>
                </div>
                <p className="kca-letter-salutation">
                  {dearLabel} <strong>{letter.applicant_name}</strong>,
                </p>
                <div className="kca-letter-body">
                  {bodyParagraphs.length > 0
                    ? bodyParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                    : <p>{defaultBody}</p>}
                </div>
                <div className="kca-letter-signature-block">
                  {signatureSrc ? (
                    <img
                      alt=""
                      className="kca-letter-signature-image"
                      src={signatureSrc}
                      style={{ maxHeight: 56, marginBottom: '0.35rem' } as CSSProperties}
                    />
                  ) : null}
                  <strong>{letter.signer_name ?? admissionsTeamLabel}</strong>
                  <span>{letter.signer_title ?? admissionsTeamLabel}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="kca-letter" aria-label="Admission letter">
      <header>{fallbackHeader}</header>
      <h1 aria-level={2}>ADMISSION LETTER</h1>
      {structured ? (
        <div className="kca-letter-document-scroll is-plain">{renderTemplateBlocks(body)}</div>
      ) : (
        <>
          <div className="kca-letter-meta">
            <span>{dateLabel ? dateLabel(issuedOn) : `Date: ${issuedOn}`}</span>
            <span>{refLabel ? refLabel(reference) : `Ref: ${reference}`}</span>
          </div>
          <p>{dearLabel} <strong>{letter.applicant_name}</strong>,</p>
          {bodyParagraphs.length > 0
            ? bodyParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            : <p>{defaultBody}</p>}
        </>
      )}
      <div className="kca-letter-signature">
        {signatureSrc ? (
          <img alt="" src={signatureSrc} style={{ maxHeight: 72, marginBottom: '0.5rem' }} />
        ) : null}
        <strong>{letter.signer_name ?? admissionsTeamLabel}</strong>
        <span>{letter.signer_title ?? admissionsTeamLabel}</span>
      </div>
    </article>
  );
}
