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
  return body.length > 400
    || body.includes('ADMISSION & ACCEPTANCE LETTER')
    || body.includes('YOUR KCA COMMITMENT')
    || body.includes('YOUR COMMITMENT')
    || body.includes('12-SESSION JOURNEY');
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

  const updated = body
    .replace(/Ref\.?\s*No\.?\s*:[^\n]*/gi, `Ref. No.: ${referenceCode}`)
    .replace(/\{reference_code\}/gi, referenceCode);

  return updated;
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

function isSectionHeading(trimmed: string): boolean {
  const heading = trimmed.replace(/:$/, '');
  return heading.length >= 8
    && heading === heading.toUpperCase()
    && !heading.includes('\n')
    && /^[A-Z0-9 '&().-]+$/.test(heading);
}

const JOURNEY_SESSIONS = [
  'The Call of the King',
  'Born into the Kingdom',
  'Living as a Child of the King',
  'Walking with the Holy Spirit',
  "At the King's Feet",
  'Becoming Like Jesus',
  'Every Disciple Is a Servant',
  "The Church: God's Family on Mission",
  'Holiness in a Compromised World',
  'Sharing the Gospel',
  'Kingdom Influence',
  'Becoming a Kingdom Change Agent',
] as const;

const COMMITMENT_ITEM_STARTS = [
  'Attend at least',
  'Actively participate',
  'Complete all',
  'Serve in at least',
  'Engage with',
  'Uphold Christian',
] as const;

function splitByStarts(text: string, starts: readonly string[]): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const pattern = new RegExp(`(?=${starts.map((start) => start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i');
  return normalized
    .split(pattern)
    .map((part) => part.replace(/^[•\-\s]+/, '').trim())
    .filter(Boolean);
}

function formatCommitmentLines(text: string): string[] {
  const items = splitByStarts(text, COMMITMENT_ITEM_STARTS);
  return (items.length ? items : [text.trim()]).map((item) => `• ${item}`);
}

function formatJourneyLines(text: string): string[] {
  const items = splitByStarts(text, JOURNEY_SESSIONS);
  if (items.length >= 4) return items.map((item) => `• ${item}`);
  const fromLines = linesOf(text);
  if (fromLines.length >= 4) return fromLines.map((item) => (item.startsWith('•') ? item : `• ${item}`));
  return [text.trim()].filter(Boolean).map((item) => (item.startsWith('•') ? item : `• ${item}`));
}

function expandCondensedSection(paragraph: string): string[] | null {
  const commitment = paragraph.match(/^(YOUR\s+KCA\s+COMMITMENT|YOUR\s+COMMITMENT)\s*:\s*(.+)$/is);
  if (commitment) return ['YOUR COMMITMENT', formatCommitmentLines(commitment[2]).join('\n')];

  const journey = paragraph.match(/^(YOUR\s+DISCIPLESHIP\s+JOURNEY|12-SESSION\s+JOURNEY)\s*:\s*(.+)$/is);
  if (journey) return ['12-SESSION JOURNEY', formatJourneyLines(journey[2]).join('\n')];

  const declaration = paragraph.match(/^(YOUR\s+KCA\s+DECLARATION|DECLARATION)\s*:\s*(.+)$/is);
  if (declaration) {
    const lines = declaration[2]
      .split(/(?<=[.!?])\s+|(?=\bI AM A KINGDOM CHANGE AGENT\b)/i)
      .map((line) => line.trim())
      .filter(Boolean);
    return ['DECLARATION', lines.join('\n')];
  }

  return null;
}

function normalizeLetterBlocks(body: string): string[] {
  const blocks: string[] = [];
  for (const paragraph of body.split(/\n\n+/).map((part) => part.trim()).filter(Boolean)) {
    const expanded = expandCondensedSection(paragraph);
    if (expanded) {
      blocks.push(...expanded);
      continue;
    }
    const lower = paragraph.toLowerCase();
    if (!paragraph.includes('\n') && lower.includes('attend at least') && lower.includes('actively participate')) {
      blocks.push('YOUR COMMITMENT', formatCommitmentLines(paragraph).join('\n'));
      continue;
    }
    if (!paragraph.includes('\n') && paragraph.includes('The Call of the King') && paragraph.includes('Becoming a Kingdom Change Agent')) {
      blocks.push('12-SESSION JOURNEY', formatJourneyLines(paragraph).join('\n'));
      continue;
    }
    blocks.push(paragraph);
  }
  return blocks;
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

  const blocks = normalizeLetterBlocks(body);
  const nodes: ReactNode[] = [];

  blocks.forEach((block, index) => {
    const trimmed = block.trim();
    const lines = linesOf(block);
    const heading = trimmed.replace(/:$/, '');

    if (isSectionHeading(trimmed)) {
      nodes.push(<h3 className="kca-letter-section-title" key={`${heading}-${index}`}>{heading}</h3>);
      return;
    }

    const bulletLines = lines.filter((line) => /^(?:•|-|\d+\.)\s+/.test(line));
    if (bulletLines.length >= 2 && bulletLines.length === lines.length) {
      const isJourney = trimmed.includes('The Call of the King') && trimmed.includes('Becoming a Kingdom Change Agent');
      nodes.push(
        <ul className={`kca-letter-list${isJourney ? ' kca-letter-list--journey' : ''}`} key={`list-${index}`}>
          {lines.map((line, lineIndex) => (
            <li key={`${index}-${lineIndex}`}>{line.replace(/^(?:•|-|\d+\.)\s+/, '')}</li>
          ))}
        </ul>,
      );
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
    ? `We are pleased to inform you that you have been accepted into the Kingdom Change Agents programme for ${batchLabel}.`
    : 'We are pleased to inform you that you have been accepted into the Kingdom Change Agents programme.';

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
