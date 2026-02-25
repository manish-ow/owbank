'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useTranslation, localeNames, type Locale } from '@/i18n';
import { useTheme } from '@/theme';
import countryConfig, { getAllCurrencies } from '@/config';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<any[]>([]);
  const { t, locale, setLocale } = useTranslation();
  const theme = useTheme();

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => res.json())
      .then((data) => setAccounts(data.accounts || []));
  }, []);

  const account = accounts[0];
  const currencies = getAllCurrencies();

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{t('settings', 'title')}</h2>

      <div className="space-y-6 max-w-2xl">
        {/* Profile Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{t('settings', 'profileInfo')}</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {session?.user?.image ? (
                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-gray-400">👤</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{session?.user?.name}</p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
              {account && (
                <p className="text-sm font-medium" style={{ color: theme.accentColor }}>
                  {account.accountNumber}
                </p>
              )}
            </div>
          </div>

          {account && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400">{t('settings', 'fullName')}</p>
                <p className="text-sm text-gray-700">{account.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('settings', 'phone')}</p>
                <p className="text-sm text-gray-700">{account.phone || t('settings', 'notSet')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('settings', 'accountType')}</p>
                <p className="text-sm text-gray-700 capitalize">{account.accountType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('settings', 'memberSince')}</p>
                <p className="text-sm text-gray-700">{new Date(account.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{t('settings', 'preferences')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{t('settings', 'language')}</p>
                <p className="text-xs text-gray-400">{t('settings', 'languageDesc')}</p>
              </div>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
                {(Object.entries(localeNames) as [Locale, string][]).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between opacity-50">
              <div>
                <p className="text-sm font-medium text-gray-700">{t('settings', 'currency')}</p>
                <p className="text-xs text-gray-400">Currency is determined by country configuration</p>
              </div>
              <select
                value={countryConfig.currency.code}
                disabled
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed"
              >
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} ({curr.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{t('settings', 'emailNotifications')}</p>
                <p className="text-xs text-gray-400">{t('settings', 'emailNotificationsDesc')}</p>
              </div>
              <button className="relative inline-flex h-7 w-12 items-center rounded-full bg-green-500">
                <span className="inline-block h-5 w-5 transform rounded-full bg-white translate-x-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <h3 className="font-semibold text-red-700 mb-4">{t('settings', 'dangerZone')}</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{t('common', 'signOut')}</p>
              <p className="text-xs text-gray-400">{t('settings', 'signOutAll')}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
            >
              {t('common', 'signOut')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
