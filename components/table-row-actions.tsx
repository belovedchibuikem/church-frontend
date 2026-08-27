type Props = {
  record: string;
  entityKey?: string;
  className?: string;
  reviewLabel?: string;
};

export function TableRowActions({ record, entityKey, className = 'row-actions table-row-actions', reviewLabel }: Props) {
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
      <button type="button" className="table-action" data-admin-action="edit" {...shared} aria-label={`Edit ${record}`}>
        Edit
      </button>
      <button type="button" className="table-action is-danger" data-admin-action="delete" {...shared} aria-label={`Delete ${record}`}>
        Delete
      </button>
    </div>
  );
}
