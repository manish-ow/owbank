'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';
import { formatCurrency } from '@/config';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const theme = useTheme();

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => res.json())
      .then((data) => setAccounts(data.accounts || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.accentColor }}></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{t('accounts', 'myAccounts')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map((acc) => (
          <div key={acc.accountNumber} className="bg-white rounded-xl border border-gray-200 overflow-hidden card-hover">
            {/* Card Header */}
            <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.accentColor} 100%)` }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium opacity-80 capitalize">{acc.accountType} Account</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  acc.status === 'active' ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'
                }`}>
                  {acc.status}
                </span>
              </div>
              <p className="text-3xl font-bold mb-1">
                {formatCurrency(acc.balance)}
              </p>
              <p className="text-sm opacity-70">{acc.accountNumber}</p>
            </div>

            {/* Card Details */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">{t('accounts', 'accountHolder')}</p>
                  <p className="text-sm font-medium text-gray-700">{acc.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('accounts', 'currency')}</p>
                  <p className="text-sm font-medium text-gray-700">{acc.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('accounts', 'kycStatus')}</p>
                  <p className={`text-sm font-medium ${acc.kycVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                    {acc.kycVerified ? t('accounts', 'verified') : t('accounts', 'pending')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('accounts', 'opened')}</p>
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(acc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
