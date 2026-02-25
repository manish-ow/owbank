'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

export default function LoansPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    tenure: '12',
    purpose: '',
    creditScore: 750,
  });
  const [result, setResult] = useState<any>(null);
  const { t } = useTranslation();
  const theme = useTheme();

  const creditScoreOptions = [
    { label: t('loans', 'excellent'), value: 820 },
    { label: t('loans', 'good'), value: 750 },
    { label: t('loans', 'fair'), value: 680 },
    { label: t('loans', 'poor'), value: 600 },
  ];

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = () => {
    fetch('/api/loans')
      .then((res) => res.json())
      .then((data) => setLoans(data.loans || []))
      .finally(() => setLoading(false));
  };

  const applyForLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    setResult(null);
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          tenure: parseInt(form.tenure),
          purpose: form.purpose,
          creditScore: form.creditScore,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        fetchLoans();
      }
    } catch (err) {
      setResult({ error: 'Failed to apply for loan' });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.accentColor }}></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">{t('loans', 'title')}</h2>
        <button
          onClick={() => setShowApply(!showApply)}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}
        >
          {t('loans', 'applyForLoan')}
        </button>
      </div>

      {/* Existing Loans */}
      {loans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {loans.map((loan) => (
            <div key={loan._id} className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{t('loans', 'personalLoan')}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  loan.status === 'disbursed' ? 'bg-green-100 text-green-700' :
                  loan.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                  loan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {loan.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-800 mb-1">${loan.amount.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mb-4">{loan.purpose}</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">{t('loans', 'rate')}</p>
                  <p className="text-sm font-bold text-gray-700">{loan.interestRate}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">{t('loans', 'tenure')}</p>
                  <p className="text-sm font-bold text-gray-700">{loan.tenure}{t('loans', 'months')}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">{t('loans', 'emi')}</p>
                  <p className="text-sm font-bold" style={{ color: theme.accentColor }}>${loan.emiAmount}</p>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-400">{t('loans', 'creditScore')}: {loan.creditScore}</div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Form */}
      {showApply && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('loans', 'loanApplication')}</h3>

          <form onSubmit={applyForLoan} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('loans', 'loanAmount')} ($1,000 - $100,000)</label>
              <input
                type="number"
                required
                min="1000"
                max="100000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="5000"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-cyan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('loans', 'tenureMonths')}</label>
              <select
                value={form.tenure}
                onChange={(e) => setForm({ ...form, tenure: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-cyan"
              >
                {[6, 12, 24, 36, 48, 60].map((m) => (
                  <option key={m} value={m}>{m} months</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('loans', 'purpose')}</label>
              <input
                type="text"
                required
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder={t('loans', 'purposePlaceholder')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-cyan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('loans', 'creditScore')}</label>
              <div className="grid grid-cols-2 gap-2">
                {creditScoreOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, creditScore: opt.value })}
                    className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      form.creditScore === opt.value
                        ? 'border-cyan bg-blue-50'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                    style={form.creditScore === opt.value ? { color: theme.primaryColor } : undefined}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={applying}
              className="w-full py-3 rounded-xl font-semibold disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}
            >
              {applying ? t('common', 'processing') : t('loans', 'submitApplication')}
            </button>
          </form>

          {result && (
            <div className={`mt-4 p-4 rounded-xl ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success ? (
                <div>
                  <p className="font-medium text-green-700">{result.message}</p>
                  <div className="mt-2 text-sm text-green-600">
                    <p>{t('loans', 'interestRate')}: {result.loan.interestRate}%</p>
                    <p>{t('loans', 'emi')}: ${result.loan.emiAmount}{t('loans', 'emiPerMonth')}</p>
                    <p>{t('loans', 'creditScore')}: {result.loan.creditScore}</p>
                  </div>
                </div>
              ) : (
                <p className="font-medium text-red-700">{result.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {loans.length === 0 && !showApply && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 mb-4">{t('loans', 'noLoans')}</p>
          <button
            onClick={() => setShowApply(true)}
            className="px-6 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: theme.accentColor, color: theme.textOnPrimary }}
          >
            {t('loans', 'applyForPersonalLoan')}
          </button>
        </div>
      )}
    </div>
  );
}
