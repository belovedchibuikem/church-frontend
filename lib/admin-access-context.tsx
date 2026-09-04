'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { emptyAccessContext, type AccessContext } from './access-control';

export type AdminAccessValue = {
  access: AccessContext;
  requestedScope: string;
};

const AdminAccessContext = createContext<AdminAccessValue>({
  access: emptyAccessContext(),
  requestedScope: 'global',
});

export function AdminAccessProvider({ value, children }: { value: AdminAccessValue; children: ReactNode }) {
  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess(): AdminAccessValue {
  return useContext(AdminAccessContext);
}
