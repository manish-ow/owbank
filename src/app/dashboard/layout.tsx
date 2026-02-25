'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import AIChat from '@/components/AIChat';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<'standard' | 'ai'>('standard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { t } = useTranslation();
  const theme = useTheme();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session?.user && !(session.user as any).hasAccount) {
      router.push('/open-account');
    }
  }, [session, status, router]);

  // REQ2: Auto-collapse sidebar when switching to AI mode
  useEffect(() => {
    setSidebarCollapsed(mode === 'ai');
  }, [mode]);

  useEffect(() => {
    const handleOpenRequest = () => setMode('ai');
    window.addEventListener('open-ai-chat', handleOpenRequest);
    return () => window.removeEventListener('open-ai-chat', handleOpenRequest);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: theme.accentColor }}></div>
          <p className="text-gray-500 text-sm">{`Loading ${theme.fullName}...`}</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      {/* Sidebar - responsive + collapsible */}
      <div
        className={`transition-all duration-300 ease-in-out flex-shrink-0 hidden md:block ${sidebarCollapsed ? 'w-0 overflow-hidden opacity-0' : 'w-[220px] opacity-100'
          }`}
      >
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {!sidebarCollapsed && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarCollapsed(true)} />
          <div className="relative w-[220px] h-full z-50">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          mode={mode}
          onModeChange={setMode}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        {mode === 'ai' ? (
          <AIChat />
        ) : (
          <main className="flex-1 overflow-auto">{children}</main>
        )}
      </div>
    </div>
  );
}
