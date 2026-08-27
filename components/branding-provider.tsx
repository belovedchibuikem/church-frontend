'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyDocumentBranding,
  defaultPublicBranding,
  loadPublicBranding,
  type PublicBranding,
} from '@/lib/branding';

type BrandingContextValue = PublicBranding & {
  refresh: () => Promise<void>;
};

const BrandingContext = createContext<BrandingContextValue>({
  ...defaultPublicBranding(),
  refresh: async () => undefined,
});

export function BrandingProvider({
  initial,
  children,
}: {
  initial?: PublicBranding;
  children: ReactNode;
}) {
  const [branding, setBranding] = useState<PublicBranding>(initial ?? defaultPublicBranding());

  useEffect(() => {
    applyDocumentBranding(branding);
  }, [branding]);

  useEffect(() => {
    let cancelled = false;
    void loadPublicBranding().then((next) => {
      if (!cancelled) setBranding(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<BrandingContextValue>(
    () => ({
      ...branding,
      refresh: async () => {
        const next = await loadPublicBranding();
        setBranding(next);
        applyDocumentBranding(next);
      },
    }),
    [branding],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}
