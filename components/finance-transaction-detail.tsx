'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/locale-provider';
import type { AdminScreen } from '../lib/admin-routes.ts';
import { apiRequest, ApiError } from '../lib/api-client';
import type { ApiSuccessEnvelope, JsonObject } from '../lib/api-types';
import { CATALOG_GLOBAL_SCOPE } from '../lib/admin-catalog-api';
import { designFixturesEnabled } from '../lib/admin-platform-api';
import { executeAdminAction, formatAdminMutationError } from '../lib/admin-mutation-dispatcher';
import { getAdminRecordDetails, stashAdminRecords } from '../lib/admin-record-cache';

const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

function transactionIdFromRoute(route: string): string | undefined {
  const match = route.match(/\/admin\/finance\/transactions\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  return match?.[1];
}

function asRecord(data: unknown): Record<string, string> {
  if (!data || typeof data !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = String(value);
    }
  }
  return out;
}

export function FinanceTransactionDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const transactionId = transactionIdFromRoute(screen.route);
  const cached = getAdminRecordDetails(transactionId);
  const [details, setDetails] = useState<Record<string, string>>(() => cached ?? screen.details ?? {});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!transactionId || !ULID.test(transactionId) || designFixturesEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        const envelope = await apiRequest<ApiSuccessEnvelope<JsonObject>>(
          `admin/finance/payment-transactions/${encodeURIComponent(transactionId)}`,
          { method: 'GET', scope: CATALOG_GLOBAL_SCOPE },
        );
        if (cancelled) return;
        const record = asRecord(envelope.data);
        stashAdminRecords([envelope.data as Record<string, unknown>]);
        setDetails(record);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (cached) {
          setDetails(cached);
          setError(null);
          return;
        }
        setError(err instanceof ApiError ? err.message : t('errors.loadTransaction', { defaultMessage: 'Unable to load transaction.' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cached, t, transactionId]);

  const runAction = async (label: string) => {
    if (!transactionId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label,
        payload: {
          id: transactionId,
          payment_transaction_id: transactionId,
          amount_minor: details.amount_minor ?? '',
        },
        scope: CATALOG_GLOBAL_SCOPE,
        recordId: transactionId,
      });
      setMessage(t('admin.actionCompleted', { defaultMessage: 'Action completed.' }));
      const envelope = await apiRequest<ApiSuccessEnvelope<JsonObject>>(
        `admin/finance/payment-transactions/${encodeURIComponent(transactionId)}`,
        { method: 'GET', scope: CATALOG_GLOBAL_SCOPE },
      );
      const record = asRecord(envelope.data);
      stashAdminRecords([envelope.data as Record<string, unknown>]);
      setDetails(record);
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  };

  const display = {
    Amount: details.amount ?? details.Amount ?? '—',
    Type: details.category ?? details.purpose_code ?? details.Type ?? '—',
    'Transaction ID': details.id ?? transactionId ?? '—',
    Date: details.occurred_at ?? details.Date ?? '—',
    Donor: details.donor_name ?? details.payer_name ?? details.Donor ?? '—',
    Channel: details.channel ?? details.provider_code ?? details.Channel ?? '—',
    Provider: details.provider_code ?? details.Provider ?? '—',
    Status: details.status ?? details.Status ?? '—',
    Receipt: details.receipt_number ?? details.Receipt ?? '—',
  };

  return (
    <div className="platform-detail">
      <article className="platform-card platform-detail-hero">
        <div>
          <span className="platform-overline">{t('admin.recordDetail', { defaultMessage: 'Record detail' })}</span>
          <h2>{t('admin.transactionDetail', { defaultMessage: 'Transaction Detail' })}</h2>
          <p>{display['Transaction ID']}</p>
          <span className="platform-badge">{display.Status}</span>
        </div>
      </article>
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
      <div className="platform-detail-grid">
        <article className="platform-card platform-definition">
          <h3>{t('admin.information', { defaultMessage: 'Information' })}</h3>
          <dl>
            {Object.entries(display).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>
        <article className="platform-card platform-detail-chart">
          <h3>{t('admin.actions', { defaultMessage: 'Actions' })}</h3>
          <p>{t('admin.financeDetailActionsCopy', { defaultMessage: 'Issue a receipt or mark this transaction reconciled when webhook processing did not complete.' })}</p>
          <button className="platform-primary" type="button" disabled={busy || !transactionId} onClick={() => void runAction('Send Receipt')}>
            {t('admin.sendReceipt', { defaultMessage: 'Send Receipt' })}
          </button>
          <button type="button" disabled={busy || !transactionId} onClick={() => void runAction('Reconcile')}>
            {t('admin.reconcile', { defaultMessage: 'Reconcile' })}
          </button>
          <button type="button" disabled={busy || !transactionId} onClick={() => void runAction('Process Refund')}>
            {t('admin.processRefund', { defaultMessage: 'Process Refund' })}
          </button>
          <Link href="/admin/finance/transactions">{t('admin.backToTransactions', { defaultMessage: 'Back to transactions' })}</Link>
        </article>
      </div>
    </div>
  );
}
