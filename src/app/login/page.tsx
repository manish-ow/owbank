'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';
import BankLogo from '@/components/BankLogo';
import dynamic from 'next/dynamic';

const OnboardingChat = dynamic(() => import('@/components/OnboardingChat'), { ssr: false });

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { t } = useTranslation();
  const theme = useTheme();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
    fetch('/api/auth/providers')
      .then((res) => res.json())
      .then((providers) => {
        if (providers?.google) setGoogleAvailable(true);
      })
      .catch(() => { });
  }, [status, router]);

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn('credentials', {
      email: email || 'demo@owbank.com',
      callbackUrl: '/dashboard',
    });
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleOnboardingSuccess = (createdEmail: string) => {
    setEmail(createdEmail);
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between p-10 relative overflow-hidden" style={{ backgroundColor: theme.primaryColor }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-20 w-96 h-96 rounded-full" style={{ background: `radial-gradient(circle, ${theme.accentColor} 0%, transparent 70%)` }} />
          <div className="absolute bottom-20 -right-20 w-80 h-80 rounded-full" style={{ background: `radial-gradient(circle, ${theme.accentColor} 0%, transparent 70%)` }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <BankLogo size="lg" />
            <span className="text-xl font-bold" style={{ color: theme.textOnPrimary }}>{theme.fullName}</span>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ color: theme.textOnPrimary }}>{theme.tagline}</h1>
          <p className="text-lg leading-relaxed max-w-sm" style={{ color: theme.textOnPrimary, opacity: 0.7 }}>{t('login', 'taglineDescription')}</p>

          {/* AI Onboarding CTA on left panel */}
          <div className="mt-8 p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl">🤖</div>
              <div>
                <p className="text-sm font-semibold" style={{ color: theme.textOnPrimary }}>New to {theme.fullName}?</p>
                <p className="text-xs opacity-60" style={{ color: theme.textOnPrimary }}>Open an account with AI in 2 minutes</p>
              </div>
            </div>
            <button
              onClick={() => setShowOnboarding(true)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: theme.textOnPrimary, color: theme.primaryColor }}
            >
              Open Account with AI ✨
            </button>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-6 text-sm" style={{ color: theme.textOnPrimary, opacity: 0.5 }}>
          <span>{t('login', 'encryption')}</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span>{t('login', 'insured')}</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span>{t('login', 'aiPowered')}</span>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <BankLogo size="lg" />
            <span className="text-xl font-bold" style={{ color: theme.primaryColor }}>{theme.fullName}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('login', 'welcomeBack')}</h2>
            <p className="text-gray-500">{t('login', 'signInSubtitle')}</p>
          </div>

          {googleAvailable && (
            <>
              <button onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="font-medium text-gray-700">{t('login', 'continueWithGoogle')}</span>
              </button>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-[#f8fafc] text-gray-400 uppercase tracking-wider">{t('common', 'or')}</span></div>
              </div>
            </>
          )}

          <form onSubmit={handleDemoLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login', 'emailLabel')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login', 'emailPlaceholder')}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan/20 focus:border-cyan transition-all text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold transition-all hover:shadow-lg disabled:opacity-50 text-sm"
              style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {t('login', 'signingIn')}
                </span>
              ) : t('login', 'signIn')}
            </button>
          </form>

          {/* Mobile AI Onboarding CTA */}
          <div className="lg:hidden mt-4">
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-xs"><span className="px-3 bg-[#f8fafc] text-gray-400 uppercase tracking-wider">New here?</span></div>
            </div>
            <button
              onClick={() => setShowOnboarding(true)}
              className="w-full py-3 rounded-xl font-semibold text-sm border-2 transition-all hover:shadow-md flex items-center justify-center gap-2"
              style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
            >
              🤖 Open Account with AI ✨
            </button>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-blue-50/80 border border-blue-100">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-800">{t('login', 'prototypeMode')}</p>
                <p className="text-xs text-blue-600 mt-0.5">{t('login', 'prototypeHint')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Onboarding Modal */}
      {showOnboarding && (
        <OnboardingChat
          onClose={() => setShowOnboarding(false)}
          onSuccess={handleOnboardingSuccess}
        />
      )}
    </div>
  );
}
