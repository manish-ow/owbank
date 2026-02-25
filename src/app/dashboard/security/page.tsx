'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

export default function SecurityPage() {
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [txAlerts, setTxAlerts] = useState(true);
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{t('security', 'title')}</h2>

      <div className="space-y-6 max-w-2xl">
        {/* Two-Factor Authentication */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">{t('security', 'twoFactor')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('security', 'twoFactorDesc')}</p>
            </div>
            <button
              onClick={() => setTwoFaEnabled(!twoFaEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                twoFaEnabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                twoFaEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Login Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">{t('security', 'loginAlerts')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('security', 'loginAlertsDesc')}</p>
            </div>
            <button
              onClick={() => setLoginAlerts(!loginAlerts)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                loginAlerts ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                loginAlerts ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Transaction Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">{t('security', 'transactionAlerts')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('security', 'transactionAlertsDesc')}</p>
            </div>
            <button
              onClick={() => setTxAlerts(!txAlerts)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                txAlerts ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                txAlerts ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Cyber Insurance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <span className="text-2xl">🛡️</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{t('security', 'cyberInsurance')}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('security', 'cyberInsuranceDesc')}
              </p>
            </div>
            <button className="px-4 py-2 text-sm font-medium rounded-lg" style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}>
              {t('security', 'learnMore')}
            </button>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{t('security', 'activeSessions')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="text-lg">💻</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('security', 'currentBrowser')}</p>
                  <p className="text-xs text-gray-400">{t('security', 'activeNow')}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{t('security', 'current')}</span>
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-2">{t('security', 'changePassword')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('security', 'googleManaged')}</p>
          <button className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
            {t('security', 'manageGoogle')}
          </button>
        </div>
      </div>
    </div>
  );
}
