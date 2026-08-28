type Props = {
  record: string;
  entityKey?: string;
  className?: string;
  reviewLabel?: string;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function TableRowActions({
  record,
  entityKey,
  className = 'row-actions table-row-actions',
  reviewLabel,
  canEdit = true,
  canDelete = true,
}: Props) {
  const shared = { 'data-record': record, ...(entityKey ? { 'data-entity': entityKey } : {}) };
  return (
    <div className={className}>
      {reviewLabel ? (
        <button type="button" className="table-action" data-admin-action="view" {...shared} aria-label={`${reviewLabel} ${record}`}>
          {reviewLabel}
        </button>
      ) : (
        <button type="button" className="table-action" data-admin-action="view" {...shared} aria-label={`View ${record}`}>
          View
        </button>
      )}
      {canEdit ? (
        <button type="button" className="table-action" data-admin-action="edit" {...shared} aria-label={`Edit ${record}`}>
          Edit
        </button>
      ) : null}
      {canDelete ? (
        <button type="button" className="table-action is-danger" data-admin-action="delete" {...shared} aria-label={`Delete ${record}`}>
          Delete
        </button>
      ) : null}
    </div>
  );
}
