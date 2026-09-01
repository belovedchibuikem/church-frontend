/** Client-side giving draft + receipt snapshot. Live GET receipt now includes amount and settlement. */

export const GIVING_DRAFT_KEY = 'fhc.giving-draft';
export const GIVING_RECEIPT_KEY = 'fhc.giving-receipt';

export const GIVING_FUNDS = [
  'Tithe',
  'Offering',
  'Mission Care Fund',
  'Building Hope Church',
  'KCA Scholarship',
] as const;

export const GIVING_PRESETS = [1000, 2500, 5000, 10000, 25000, 50000] as const;

export const MANUAL_GIVING_METHODS = ['Bank Transfer', 'USSD', 'Wallet'] as const;

export function isManualGivingMethod(method: string): boolean {
  return (MANUAL_GIVING_METHODS as readonly string[]).includes(method);
}

export function givingFundToPurpose(fund: string): 'tithe' | 'offering' | 'missions' | 'projects' | 'kca' | 'donation' {
  switch (fund) {
    case 'Tithe':
      return 'tithe';
    case 'Offering':
    case 'General Offering':
      return 'offering';
    case 'Mission Care Fund':
      return 'missions';
    case 'Building Hope Church':
      return 'projects';
    case 'KCA Scholarship':
      return 'kca';
    default:
      return 'donation';
  }
}

export type GivingDraft = {
  amount: string;
  fund: string;
  note: string;
  method: string;
  currency: string;
};

export type GivingReceiptSnapshot = {
  receiptId?: string | null;
  receiptNumber?: string | null;
  intentId?: string | null;
  amountMinor: number;
  currency: string;
  fund: string;
  note: string;
  method: string;
  issuedAt?: string | null;
  status?: string | null;
};

export const emptyGivingDraft = (): GivingDraft => ({
  amount: '',
  fund: 'Tithe',
  note: '',
  method: 'Card',
  currency: 'NGN',
});

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function readGivingDraft(): GivingDraft | null {
  const draft = readJson<GivingDraft>(GIVING_DRAFT_KEY);
  if (!draft || typeof draft.amount !== 'string') return null;
  return {
    amount: draft.amount,
    fund: draft.fund || 'Tithe',
    note: draft.note ?? '',
    method: draft.method || 'Card',
    currency: (draft.currency || 'NGN').toUpperCase(),
  };
}

export function writeGivingDraft(draft: GivingDraft): void {
  writeJson(GIVING_DRAFT_KEY, {
    amount: draft.amount,
    fund: draft.fund,
    note: draft.note,
    method: draft.method,
    currency: draft.currency.toUpperCase(),
  });
}

export function clearGivingDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(GIVING_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function readGivingReceiptSnapshot(): GivingReceiptSnapshot | null {
  const snap = readJson<GivingReceiptSnapshot>(GIVING_RECEIPT_KEY);
  if (!snap || !Number.isFinite(snap.amountMinor)) return null;
  return snap;
}

export function writeGivingReceiptSnapshot(snapshot: GivingReceiptSnapshot): void {
  writeJson(GIVING_RECEIPT_KEY, snapshot);
}

export function parseGivingAmountMajor(raw: string): number | null {
  const amount = Number(String(raw).replace(/,/g, '').trim());
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}
