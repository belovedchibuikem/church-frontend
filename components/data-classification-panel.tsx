'use client';

import { useLocale } from '@/components/locale-provider';
import type { AdminScreen } from '../lib/admin-routes.ts';

/** Mirrors `App\Files\FileAssetClassification` + `App\Platform\ConfigurationClassification`. */
const FILE_LEVELS = [
  { code: 'public', label: 'Public', audience: 'Everyone', note: 'Safe for unrestricted distribution.' },
  { code: 'internal', label: 'Internal', audience: 'All Staff', note: 'Staff-only operational content.' },
  { code: 'confidential', label: 'Confidential', audience: 'Role Based', note: 'Limited to authorized roles.' },
  { code: 'restricted', label: 'Restricted', audience: 'Need to Know', note: 'Highest sensitivity; access is audited.' },
] as const;

const CONFIG_LEVELS = [
  { code: 'internal', label: 'Internal', note: 'Platform configuration defaults.' },
  { code: 'confidential', label: 'Confidential', note: 'Secrets and provider credentials.' },
] as const;

export function DataClassificationPanel({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();

  return (
    <div className="platform-dashboard">
      <p className="maps-settings-lead" role="status">
        {t('admin.dataClassificationLead', {
          defaultMessage:
            'Live taxonomy from platform enums. Classification labels are enforced on file assets and configuration records — there is no separate CRUD catalog.',
        })}
      </p>
      <article className="platform-card platform-table-card">
        <header>
          <h2>{screen.title}</h2>
          <p>{screen.subtitle}</p>
        </header>
        <div className="platform-table-scroll">
          <table aria-label={t('admin.fileClassifications', { defaultMessage: 'File asset classifications' })}>
            <thead>
              <tr>
                <th scope="col">{t('admin.name', { defaultMessage: 'Name' })}</th>
                <th scope="col">{t('admin.type', { defaultMessage: 'Type' })}</th>
                <th scope="col">{t('admin.status', { defaultMessage: 'Status' })}</th>
                <th scope="col">{t('admin.updated', { defaultMessage: 'Updated' })}</th>
              </tr>
            </thead>
            <tbody>
              {FILE_LEVELS.map((level) => (
                <tr key={level.code}>
                  <td>
                    <span className="platform-leading">
                      <i>{level.label.slice(0, 2).toUpperCase()}</i>
                      <b>{level.label}</b>
                    </span>
                  </td>
                  <td>{level.audience}</td>
                  <td>Active</td>
                  <td>{level.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <article className="platform-card platform-table-card" style={{ marginTop: '1rem' }}>
        <header>
          <h2>{t('admin.configurationClassifications', { defaultMessage: 'Configuration classifications' })}</h2>
        </header>
        <div className="platform-table-scroll">
          <table aria-label={t('admin.configurationClassifications', { defaultMessage: 'Configuration classifications' })}>
            <thead>
              <tr>
                <th scope="col">{t('admin.name', { defaultMessage: 'Name' })}</th>
                <th scope="col">{t('admin.code', { defaultMessage: 'Code' })}</th>
                <th scope="col">{t('admin.notes', { defaultMessage: 'Notes' })}</th>
              </tr>
            </thead>
            <tbody>
              {CONFIG_LEVELS.map((level) => (
                <tr key={level.code}>
                  <td><b>{level.label}</b></td>
                  <td>{level.code}</td>
                  <td>{level.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
