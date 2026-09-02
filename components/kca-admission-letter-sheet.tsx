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

function normalizeSignerValue(value: string): string {
  return value.trim().toLowerCase();
}

function linesOf(block: string): string[] {
  return block.split('\n').map((line) => line.trim()).filter(Boolean);
}

function matchesSignerLine(line: string, expected: string): boolean {
  if (!expected) return false;
  const normalizedLine = normalizeSignerValue(line);
  const normalizedExpected = normalizeSignerValue(expected);
  return normalizedLine === normalizedExpected
    || normalizedLine.startsWith(`${normalizedExpected},`)
    || normalizedExpected.startsWith(`${normalizedLine},`);
}

function syncReferenceInBody(
  body: string,
  referenceCode: string | null | undefined,
  pendingReferenceLabel: string,
): string {
  if (!referenceCode || referenceCode === pendingReferenceLabel) {
    return body;
  }

  return body
    .replace(/Ref\.?\s*No\.?\s*:\s*Pending/gi, `Ref. No.: ${referenceCode}`)
    .replace(/\{reference_code\}/gi, referenceCode);
}

function renderSignatureImage(signatureSrc: string, key: string): ReactNode {
  return (
    <div className="kca-letter-signature-block kca-letter-signature-block--inline" key={key}>
      <img
        alt=""
        className="kca-letter-signature-image"
        src={signatureSrc}
        style={{ maxHeight: 56, margin: '0.15rem 0 0.35rem' } as CSSProperties}
      />
    </div>
  );
}

function renderTemplateBlocks(
  body: string,
  options?: {
    signatureSrc?: string | null;
    signerName?: string | null;
    signerTitle?: string | null;
  },
): ReactNode {
  const signatureSrc = options?.signatureSrc ?? null;
  const signerName = options?.signerName?.trim() ?? '';
  const signerTitle = options?.signerTitle?.trim() ?? '';
  let signatureInserted = false;

  const blocks = body.split('\n\n').filter(Boolean);
  const nodes: ReactNode[] = [];

  blocks.forEach((block, index) => {
    const trimmed = block.trim();
    const lines = linesOf(block);
    const isHeading = trimmed.length >= 8
      && trimmed === trimmed.toUpperCase()
      && !trimmed.includes(':')
      && /^[A-Z0-9 '&().-]+$/.test(trimmed);

    if (isHeading) {
      nodes.push(<h3 className="kca-letter-section-title" key={`${trimmed}-${index}`}>{trimmed}</h3>);
      return;
    }

    const nameLineIndex = signerName
      ? lines.findIndex((line) => matchesSignerLine(line, signerName))
      : -1;

    if (lines.length > 1 && nameLineIndex >= 0 && signatureSrc) {
      lines.forEach((line, lineIndex) => {
        nodes.push(
          <p className="kca-letter-section-paragraph" key={`${index}-${lineIndex}`}>{line}</p>,
        );
        if (lineIndex === nameLineIndex) {
          nodes.push(renderSignatureImage(signatureSrc, `signature-${index}-${lineIndex}`));
          signatureInserted = true;
        }
      });
      return;
    }

    const isSignerNameBlock = Boolean(signerName && (
      matchesSignerLine(trimmed, signerName)
      || lines.some((line) => matchesSignerLine(line, signerName))
    ));

    nodes.push(
      <p className="kca-letter-section-paragraph" key={`${trimmed}-${index}`}>{trimmed}</p>,
    );

    if (signatureSrc && isSignerNameBlock && !signatureInserted) {
      nodes.push(renderSignatureImage(signatureSrc, `signature-${index}`));
      signatureInserted = true;
    }
  });

  if (signatureSrc && !signatureInserted && signerName) {
    nodes.push(
      <div className="kca-letter-signature-block kca-letter-signature-block--closing" key="signature-closing">
        {renderSignatureImage(signatureSrc, 'signature-closing')}
      </div>,
    );
  } else if (signatureSrc && !signatureInserted) {
    nodes.push(renderSignatureImage(signatureSrc, 'signature-fallback'));
  }

  return nodes;
}

function ProvostSignatureBlock({
  signatureSrc,
  signerName,
  signerTitle,
  fallbackLabel,
}: {
  signatureSrc?: string | null;
  signerName?: string | null;
  signerTitle?: string | null;
  fallbackLabel: string;
}) {
  return (
    <div className="kca-letter-signature-block">
      <strong>{signerName ?? fallbackLabel}</strong>
      {signatureSrc ? (
        <img
          alt=""
          className="kca-letter-signature-image"
          src={signatureSrc}
          style={{ maxHeight: 56, margin: '0.15rem 0 0.35rem' } as CSSProperties}
        />
      ) : null}
      <span>{signerTitle ?? fallbackLabel}</span>
    </div>
  );
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
  const body = syncReferenceInBody(letter.letter_body ?? '', letter.reference_code, pendingReferenceLabel);
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
                {renderTemplateBlocks(body, {
                  signatureSrc,
                  signerName: letter.signer_name,
                  signerTitle: letter.signer_title,
                })}
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
                <ProvostSignatureBlock
                  fallbackLabel={admissionsTeamLabel}
                  signatureSrc={signatureSrc}
                  signerName={letter.signer_name}
                  signerTitle={letter.signer_title}
                />
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
        <div className="kca-letter-document-scroll is-plain">
          {renderTemplateBlocks(body, {
            signatureSrc,
            signerName: letter.signer_name,
            signerTitle: letter.signer_title,
          })}
        </div>
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
          <ProvostSignatureBlock
            fallbackLabel={admissionsTeamLabel}
            signatureSrc={signatureSrc}
            signerName={letter.signer_name}
            signerTitle={letter.signer_title}
          />
        </>
      )}
    </article>
  );
}
