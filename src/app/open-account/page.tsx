'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';
import { getCountryConfig } from '@/config';
import BankLogo from '@/components/BankLogo';

export default function OpenAccountPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    phone: '',
    address: '',
    accountType: 'savings',
  });
  const [result, setResult] = useState<any>(null);
  const { t } = useTranslation();
  const theme = useTheme();
  const config = getCountryConfig();
  const currencySymbol = config.currency.symbol;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (session?.user?.name) {
      setForm((prev) => ({ ...prev, fullName: session.user!.name || '' }));
    }
    if ((session?.user as any)?.hasAccount) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/accounts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        await update();
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2500);
      } else {
        alert(data.error || 'Failed to open account');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('openAccount', 'accountCreated')}</h2>
          <p className="text-gray-500 text-sm mb-6">{result.message}</p>
          <div className="bg-gray-50 rounded-xl p-5 mb-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('openAccount', 'accountNumber')}</p>
            <p className="text-2xl font-bold tracking-wide" style={{ color: theme.primaryColor }}>{result.account.accountNumber}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-5 mb-6 border border-green-100">
            <p className="text-xs text-green-600 uppercase tracking-wider mb-1">{t('openAccount', 'welcomeBonusCredited')}</p>
            <p className="text-2xl font-bold text-green-700">{currencySymbol}{config.welcomeBonus.toLocaleString()}.00</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {t('openAccount', 'redirecting')}
          </div>
        </div>
      </div>
    );
  }

  const benefits = [
    t('openAccount', 'benefit1'),
    t('openAccount', 'benefit2'),
    t('openAccount', 'benefit3'),
    t('openAccount', 'benefit4'),
  ];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      <div className="hidden lg:flex lg:w-[440px] flex-col justify-between p-10 relative overflow-hidden" style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-20 w-96 h-96 rounded-full" style={{ background: `radial-gradient(circle, ${theme.accentColor} 0%, transparent 70%)` }} />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <BankLogo size="lg" />
          <span className="text-xl font-bold">{theme.fullName}</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold leading-tight mb-4">{t('openAccount', 'heroTitle')}</h1>
          <p className="opacity-60 leading-relaxed">{t('openAccount', 'heroSubtitle')}</p>
          <div className="mt-8 space-y-4">
            {benefits.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3 h-3" style={{ color: theme.textOnPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-sm opacity-80">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[480px]">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <BankLogo size="md" />
            <span className="text-lg font-bold" style={{ color: theme.primaryColor }}>{theme.fullName}</span>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('openAccount', 'formTitle')}</h2>
            <p className="text-gray-500 text-sm">{t('openAccount', 'formSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? '' : 'bg-gray-100 text-gray-400'}`} style={step >= s ? { backgroundColor: theme.primaryColor, color: theme.textOnPrimary } : {}}>
                  {step > s ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-gray-700' : 'text-gray-400'}`}>{s === 1 ? t('openAccount', 'step1') : t('openAccount', 'step2')}</span>
                {s < 2 && <div className="flex-1 h-px" style={step > s ? { backgroundColor: theme.primaryColor } : { backgroundColor: '#e5e7eb' }} />}
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit}>
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('openAccount', 'fullName')}</label>
                  <input type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan/20 focus:border-cyan transition-all text-sm" placeholder={t('openAccount', 'fullNamePlaceholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('openAccount', 'dateOfBirth')}</label>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan/20 focus:border-cyan transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('openAccount', 'phoneNumber')}</label>
                  <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan/20 focus:border-cyan transition-all text-sm" placeholder={t('openAccount', 'phonePlaceholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('openAccount', 'address')}</label>
                  <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan/20 focus:border-cyan transition-all text-sm" placeholder={t('openAccount', 'addressPlaceholder')} />
                </div>
                <button type="button" onClick={() => { if (form.fullName && form.phone) setStep(2); }} className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-lg" style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}>{t('common', 'continue')}</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">{t('openAccount', 'accountType')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ type: 'savings', label: t('openAccount', 'savings'), desc: t('openAccount', 'savingsDesc') }, { type: 'checking', label: t('openAccount', 'checking'), desc: t('openAccount', 'checkingDesc') }].map((opt) => (
                      <button key={opt.type} type="button" onClick={() => setForm({ ...form, accountType: opt.type })} className={`p-4 rounded-xl border-2 text-left transition-all ${form.accountType === opt.type ? 'border-cyan bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <p className={`text-sm font-semibold ${form.accountType === opt.type ? '' : 'text-gray-700'}`} style={form.accountType === opt.type ? { color: theme.primaryColor } : {}}>{opt.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0"><span className="text-green-700 font-bold">{currencySymbol}</span></div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">{t('openAccount', 'welcomeBonus')}</p>
                      <p className="text-xs text-green-600">{t('openAccount', 'welcomeBonusDesc')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">{t('common', 'back')}</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-lg disabled:opacity-50" style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}>{loading ? t('openAccount', 'creatingAccount') : t('openAccount', 'openAccount')}</button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
