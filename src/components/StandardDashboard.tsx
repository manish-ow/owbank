'use client';

import { useEffect, useState } from 'react';
import countryConfig, { formatCurrency } from '@/config';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

interface AccountData {
  accountNumber: string;
  accountType: string;
  balance: number;
  status: string;
}

interface TransactionData {
  reference: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function StandardDashboard() {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [myAccount, setMyAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const theme = useTheme();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        fetch('/api/accounts').catch(() => null),
        fetch('/api/transactions?limit=10').catch(() => null),
      ]);
      if (accRes?.ok) {
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
      }
      if (txRes?.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
        if (txData.accountNumber) setMyAccount(txData.accountNumber);
      }
    } catch {
      // Silently handle fetch errors (e.g. during hot reload)
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('dashboard', 'totalBalance')}
          value={formatCurrency(totalBalance)}
          subtitle={`+20.1% ${t('dashboard', 'fromLastMonth')}`}
          icon={countryConfig.currency.symbol}
          color={theme.primaryColor}
        />
        <StatCard
          title={t('dashboard', 'monthlySpending')}
          value="$2,350.00"
          subtitle={`+12% ${t('dashboard', 'fromLastMonth')}`}
          icon="↗"
          color={theme.accentColor}
        />
        <StatCard
          title={t('dashboard', 'savingsGoal')}
          value="$12,000.00"
          subtitle={`80% ${t('dashboard', 'ofGoal')} ($15k)`}
          icon="✓"
          color="#10B981"
        />
        <StatCard
          title={t('dashboard', 'creditLimit')}
          value="$10,000.00"
          subtitle={`${t('dashboard', 'available')}: $8,500`}
          icon="⬜"
          color="#8B5CF6"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('dashboard', 'recentTransactions')}</h3>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('dashboard', 'noTransactions')}</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.reference} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.type === 'bonus' ? 'bg-green-100' :
                      tx.type === 'transfer' ? 'bg-blue-100' :
                      tx.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <span className="text-lg">
                        {tx.type === 'bonus' ? '🎁' :
                         tx.type === 'transfer' ? '↗️' :
                         tx.type === 'deposit' ? '💰' : '💸'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{tx.description}</p>
                      <p className="text-xs text-gray-400">
                        {tx.reference} · {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      tx.type === 'bonus' || tx.type === 'deposit' || tx.toAccount === myAccount ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'bonus' || tx.type === 'deposit' || tx.toAccount === myAccount ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className={`text-xs ${tx.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('dashboard', 'quickActions')}</h3>
          <div className="space-y-3">
            <QuickActionBtn href="/dashboard/transfers" label={t('dashboard', 'transferMoney')} icon="↗" primary primaryColor={theme.primaryColor} accentColor={theme.accentColor} />
            <QuickActionBtn href="/dashboard/transfers" label={t('dashboard', 'addMoney')} icon="+" accent primaryColor={theme.primaryColor} accentColor={theme.accentColor} />
            <QuickActionBtn href="/dashboard/transfers" label={t('dashboard', 'payBill')} icon="⬜" primaryColor={theme.primaryColor} accentColor={theme.accentColor} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{title}</p>
        <span className="text-gray-400 text-sm">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs mt-1" style={{ color }}>
        {subtitle}
      </p>
    </div>
  );
}

function QuickActionBtn({
  href,
  label,
  icon,
  primary,
  accent,
  primaryColor,
  accentColor,
}: {
  href: string;
  label: string;
  icon: string;
  primary?: boolean;
  accent?: boolean;
  primaryColor: string;
  accentColor: string;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 w-full py-3 px-4 rounded-xl font-medium text-sm transition-all ${
        primary
          ? 'text-white hover:opacity-90'
          : accent
          ? 'text-white hover:opacity-90'
          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
      style={primary ? { backgroundColor: primaryColor } : accent ? { backgroundColor: accentColor } : {}}
    >
      <span>{icon}</span>
      {label}
    </a>
  );
}
