'use client';

import Link from 'next/link';
import { useLocale } from '@/components/locale-provider';
import type { AdminScreen } from '../lib/admin-routes.ts';
import { localeMeta, supportedLocales } from '../lib/i18n/types';

const DOMAIN_LINKS: Record<string, Array<{ href: string; label: string; note: string }>> = {
  ministry: [
    { href: '/admin/people/follow-up', label: 'Follow-up', note: 'Pastoral follow-up tasks' },
    { href: '/admin/people/needs', label: 'Pastoral needs', note: 'Need review queue' },
    { href: '/admin/people/first-timers', label: 'First timers', note: 'First-timer queue' },
  ],
  'home-church-rules': [
    { href: '/admin/home-churches/applications', label: 'Applications', note: 'Review and transition applications' },
    { href: '/admin/home-churches', label: 'Home Churches', note: 'Live home church directory' },
  ],
  mission: [
    { href: '/admin/mission/crusades', label: 'Crusades', note: 'Mission crusade ops' },
    { href: '/admin/mission/souls', label: 'Souls', note: 'Soul journey follow-up' },
  ],
  press: [
    { href: '/admin/press/publications', label: 'Publications', note: 'Editorial pipeline' },
    { href: '/admin/press/translations', label: 'Translations', note: 'Translation workflow' },
    { href: '/admin/press/manuscripts', label: 'Manuscripts', note: 'Manuscript catalogue' },
  ],
};

function domainKey(route: string): string | null {
  if (route.includes('/settings/ministry')) return 'ministry';
  if (route.includes('/settings/home-church-rules')) return 'home-church-rules';
  if (route.includes('/settings/mission')) return 'mission';
  if (route.includes('/settings/press')) return 'press';
  return null;
}

export function DomainSettingsLinksPanel({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const key = domainKey(screen.route);
  const links = key ? DOMAIN_LINKS[key] ?? [] : [];

  return (
    <article className="platform-card platform-settings-body">
      <h2>{screen.title}</h2>
      <p className="maps-settings-lead" role="status">
        {t('admin.domainSettingsLead', {
          defaultMessage: 'No dedicated settings CRUD API exists for this domain. Use the live operations screens below.',
        })}
      </p>
      <ul className="platform-preview-list">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
            <span> — {link.note}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function LanguagesSettingsPanel({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();

  return (
    <article className="platform-card platform-settings-body">
      <h2>{screen.title}</h2>
      <p className="maps-settings-lead" role="status">
        {t('admin.languagesSettingsLead', {
          defaultMessage: 'Admin UI locales are defined in the frontend locale catalog. There is no languages admin API to create or delete locales.',
        })}
      </p>
      <div className="platform-table-scroll">
        <table aria-label={t('admin.supportedLanguages', { defaultMessage: 'Supported languages' })}>
          <thead>
            <tr>
              <th scope="col">{t('admin.code', { defaultMessage: 'Code' })}</th>
              <th scope="col">{t('admin.name', { defaultMessage: 'Name' })}</th>
              <th scope="col">{t('admin.endonym', { defaultMessage: 'Endonym' })}</th>
              <th scope="col">{t('admin.direction', { defaultMessage: 'Direction' })}</th>
            </tr>
          </thead>
          <tbody>
            {supportedLocales.map((code) => (
              <tr key={code}>
                <td><code>{code}</code></td>
                <td>{localeMeta[code].englishName}</td>
                <td>{localeMeta[code].endonym}</td>
                <td>{localeMeta[code].direction.toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
