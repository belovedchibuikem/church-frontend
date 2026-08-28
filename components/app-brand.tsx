'use client';

import Link from 'next/link';
import { useBranding } from './branding-provider';
import { useLocale } from '@/components/locale-provider';
import { DEFAULT_APP_NAME } from '@/lib/branding';

function splitName(name: string): [string, string] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [name, ''];
  const breakAt = Math.max(1, Math.ceil(words.length / 2));
  return [words.slice(0, breakAt).join(' '), words.slice(breakAt).join(' ')];
}

export function AppBrand({
  variant,
  dark = true,
  href,
}: {
  variant: 'admin' | 'site' | 'auth' | 'member';
  dark?: boolean;
  href?: string;
}) {
  const branding = useBranding();
  const { t } = useLocale();
  const name = branding.app_name || DEFAULT_APP_NAME;
  const [first, second] = splitName(name);
  const logo = branding.logo_url;
  const homeLabel = t('nav.home', { defaultMessage: 'Home' });
  const brandHomeLabel = `${name}, ${homeLabel}`;

  if (variant === 'site' || variant === 'member') {
    const content = (
      <>
        {logo ? <img src={logo} alt="" /> : <span aria-hidden="true">⬡</span>}
        <b>
          {first}
          {second ? (
            <>
              <br />
              {second}
            </>
          ) : null}
        </b>
      </>
    );
    if (variant === 'member') {
      return <div className="site-logo member-brand">{content}</div>;
    }
    return (
      <Link className="site-logo" href={href ?? '/'} aria-label={brandHomeLabel}>
        {content}
      </Link>
    );
  }

  if (variant === 'auth') {
    return (
      <div className="app-brand-auth">
        {logo ? <img src={logo} alt="" /> : null}
        <span className="eyebrow">{name}</span>
      </div>
    );
  }

  return (
    <div className={`brand ${dark ? '' : 'brand-light'}${logo ? ' has-logo' : ''}`}>
      {logo ? (
        <img className="brand-mark-image" src={logo} alt="" />
      ) : (
        <span className="brand-mark">◆</span>
      )}
      <span className="brand-copy">
        {first}
        {second ? (
          <>
            <br />
            {second}
          </>
        ) : null}
      </span>
    </div>
  );
}
