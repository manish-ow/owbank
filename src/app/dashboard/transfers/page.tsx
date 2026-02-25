'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

export default function TransfersPage() {
  const [form, setForm] = useState({ toAccount: '', amount: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [myAccount, setMyAccount] = useState('');
  const { t } = useTranslation();
  const theme = useTheme();

  useEffect(() => {
    fetch('/api/transactions?limit=20')
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data.transactions || []);
        setMyAccount(data.accountNumber || '');
      })
      .finally(() => setTxLoading(false));
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toAccount: form.toAccount,
          amount: parseFloat(form.amount),
          description: form.description,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        setForm({ toAccount: '', amount: '', description: '' });
        // Refresh transactions
        const txRes = await fetch('/api/transactions?limit=20');
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
        if (txData.accountNumber) setMyAccount(txData.accountNumber);
      }
    } catch (err) {
      setResult({ error: 'Transfer failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{t('transfers', 'title')}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('transfers', 'sendMoney')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('transfers', 'sendSubtitle')}</p>

          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('transfers', 'recipientAccount')}</label>
              <input
                type="text"
                required
                value={form.toAccount}
                onChange={(e) => setForm({ ...form, toAccount: e.target.value })}
                placeholder={t('transfers', 'recipientPlaceholder')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-cyan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('transfers', 'amount')}</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder={t('transfers', 'amountPlaceholder')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-cyan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('transfers', 'description')}</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('transfers', 'descPlaceholder')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-cyan"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}
            >
              {loading ? t('common', 'processing') : t('transfers', 'transferMoney')}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div className={`mt-4 p-4 rounded-xl ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success ? (
                <div>
                  <p className="font-medium text-green-700">{result.message}</p>
                  <p className="text-sm text-green-600 mt-1">{t('transfers', 'ref')}: {result.transaction?.reference}</p>
                  <p className="text-sm text-green-600">{t('transfers', 'newBalance')}: ${result.newBalance?.toFixed(2)}</p>
                </div>
              ) : (
                <p className="font-medium text-red-700">{result.error}</p>
              )}
            </div>
          )}


        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('transfers', 'transactionHistory')}</h3>
          {txLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: theme.accentColor }}></div>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">{t('transfers', 'noTransactions')}</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {transactions.map((tx) => (
                <div key={tx.reference} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${tx.type === 'bonus' ? 'bg-green-100' :
                      tx.type === 'transfer' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                      {tx.type === 'bonus' ? '🎁' : tx.type === 'transfer' ? '↗️' : '💰'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{tx.description}</p>
                      <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'bonus' || tx.toAccount === myAccount ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {tx.type === 'bonus' || tx.toAccount === myAccount ? '+' : '-'}${tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
