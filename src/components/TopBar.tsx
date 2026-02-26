'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';
import BankLogo from '@/components/BankLogo';

interface TopBarProps {
  mode: 'standard' | 'ai';
  onModeChange: (mode: 'standard' | 'ai') => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function TopBar({ mode, onModeChange, sidebarCollapsed, onToggleSidebar }: TopBarProps) {
  const { data: session } = useSession();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const theme = useTheme();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger / Sidebar toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
            title={sidebarCollapsed ? t('common', 'showSidebar') : t('common', 'hideSidebar')}
          >
            {sidebarCollapsed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            )}
          </button>
        )}

        {/* Logo - visible when sidebar is collapsed (e.g. AI First mode) */}
        {sidebarCollapsed && (
          <div className="flex items-center gap-2 transition-opacity duration-300">
            <BankLogo size="sm" />
            <span className="text-base font-bold hidden sm:inline" style={{ color: theme.primaryColor }}>{theme.fullName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => onModeChange('ai')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs font-medium transition-all ${mode === 'ai'
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="hidden sm:inline">{t('common', 'aiFirst')}</span>
          </button>
          <button
            onClick={() => onModeChange('standard')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs font-medium transition-all ${mode === 'standard'
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="hidden sm:inline">{t('common', 'standard')}</span>
          </button>
        </div>

        {/* Separator */}
        <div className="w-px h-8 bg-gray-200 hidden sm:block" />

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 hidden sm:block">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-all"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.primaryColor }}>
              {session?.user?.image ? (
                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold" style={{ color: theme.textOnPrimary }}>
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-gray-700 leading-tight">{session?.user?.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{(session?.user as any)?.accountNumber || session?.user?.email}</p>
            </div>
            <svg className="w-4 h-4 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-14 w-60 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-medium text-sm text-gray-800">{session?.user?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{session?.user?.email}</p>
                {(session?.user as any)?.accountNumber && (
                  <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-xs font-medium" style={{ color: theme.primaryColor }}>
                    {(session?.user as any)?.accountNumber}
                  </div>
                )}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                {t('common', 'signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
