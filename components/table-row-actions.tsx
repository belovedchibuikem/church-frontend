'use client';

import { useLocale } from '@/components/locale-provider';

type Props = {
  record: string;
  entityKey?: string;
  className?: string;
  reviewLabel?: string;
  /** Opens confirm overlay and runs mutation dispatcher for this label. */
  mutationLabel?: string;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function TableRowActions({
  record,
  entityKey,
  className = 'row-actions table-row-actions',
  reviewLabel,
  mutationLabel,
  canEdit = true,
  canDelete = true,
}: Props) {
  const { t } = useLocale();
  const viewLabel = t('common.view', { defaultMessage: 'View' });
  const editLabel = t('common.edit', { defaultMessage: 'Edit' });
  const deleteLabel = t('common.delete', { defaultMessage: 'Delete' });
  const shared = { 'data-record': record, ...(entityKey ? { 'data-entity': entityKey } : {}) };
  return (
    <div className={className}>
      {mutationLabel ? (
        <button
          type="button"
          className="table-action"
          {...shared}
          aria-label={t('common.actionNamed', {
            defaultMessage: '{action} {record}',
            vars: { action: mutationLabel, record },
          })}
        >
          {mutationLabel}
        </button>
      ) : null}
      {reviewLabel ? (
        <button
          type="button"
          className="table-action"
          data-admin-action="view"
          {...shared}
          aria-label={t('common.actionNamed', {
            defaultMessage: '{action} {record}',
            vars: { action: reviewLabel, record },
          })}
        >
          {reviewLabel}
        </button>
      ) : (
        <button
          type="button"
          className="table-action"
          data-admin-action="view"
          {...shared}
          aria-label={t('common.viewRecord', { defaultMessage: 'View {record}', vars: { record } })}
        >
          {viewLabel}
        </button>
      )}
      {canEdit ? (
        <button
          type="button"
          className="table-action"
          data-admin-action="edit"
          {...shared}
          aria-label={t('common.editRecord', { defaultMessage: 'Edit {record}', vars: { record } })}
        >
          {editLabel}
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          className="table-action is-danger"
          data-admin-action="delete"
          {...shared}
          aria-label={t('common.deleteRecord', { defaultMessage: 'Delete {record}', vars: { record } })}
        >
          {deleteLabel}
        </button>
      ) : null}
    </div>
  );
}
