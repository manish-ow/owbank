'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/theme';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <I18nProvider>
          {children}
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
