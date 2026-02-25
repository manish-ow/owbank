'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/theme';
import { ToastProvider } from '@/contexts/ToastContext';
import ToastContainer from '@/components/Toast';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
          <ToastContainer />
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
