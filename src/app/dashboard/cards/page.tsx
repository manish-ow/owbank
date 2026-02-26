'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';
import countryConfig, { formatCurrency } from '@/config';
import { useToast } from '@/hooks/useToast';

export default function CardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [confirmCard, setConfirmCard] = useState<{ type: string; name: string; insurance: boolean; limit: string; fee: string } | null>(null);
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();

  const cardTypes = [
    { type: 'standard', name: t('cards', 'standard'), limit: formatCurrency(countryConfig.cardLimits.standard), color: 'from-gray-700 to-gray-900', fee: t('cards', 'free') },
    { type: 'gold', name: t('cards', 'gold'), limit: formatCurrency(countryConfig.cardLimits.gold), color: 'from-yellow-600 to-yellow-800', fee: `${countryConfig.currency.symbol}49/yr` },
    { type: 'platinum', name: t('cards', 'platinum'), limit: formatCurrency(countryConfig.cardLimits.platinum), color: 'from-gray-800 to-gray-950', fee: `${countryConfig.currency.symbol}99/yr` },
  ];

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = () => {
    fetch('/api/cards')
      .then((res) => res.json())
      .then((data) => setCards(data.cards || []))
      .finally(() => setLoading(false));
  };

  const applyForCard = async (cardType: string, cyberInsurance: boolean) => {
    setApplying(true);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardType, cyberInsurance }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchCards();
        setShowApply(false);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Failed to apply for card');
    } finally {
      setApplying(false);
    }
  };

  const toggleFreeze = async (cardId: string) => {
    try {
      const res = await fetch(`/api/cards/${cardId}/freeze`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Card status updated');
        fetchCards();
      }
    } catch (err) {
      toast.error('Failed to update card');
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
        <h2 className="text-xl font-bold text-gray-800">{t('cards', 'myCards')}</h2>
        <button
          onClick={() => setShowApply(!showApply)}
          className="px-4 py-2 text-white rounded-lg text-sm font-medium"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {t('cards', 'applyForCard')}
        </button>
      </div>

      {/* Existing Cards */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {cards.map((card) => (
            <div key={card._id} className="rounded-xl overflow-hidden shadow-lg card-hover">
              <div className={`p-5 text-white bg-gradient-to-br ${
                card.cardType === 'gold' ? 'from-yellow-600 to-yellow-800' :
                card.cardType === 'platinum' ? 'from-gray-800 to-gray-950' :
                'from-gray-700 to-gray-900'
              }`}>
                <div className="flex justify-between items-start mb-8">
                  <span className="text-sm font-medium opacity-80 capitalize">{card.cardType}</span>
                  <span className="text-lg font-bold">{theme.logo}</span>
                </div>
                <p className="text-lg tracking-widest mb-4 font-mono">
                  ****  ****  ****  {card.cardNumber.slice(-4)}
                </p>
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs opacity-60">Expires</p>
                    <p className="text-sm">{card.expiryDate}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-60">Status</p>
                    <p className={`text-sm font-medium ${card.status === 'active' ? 'text-green-300' : 'text-red-300'}`}>
                      {card.status}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-xs text-gray-400">{t('cards', 'creditLimit')}</p>
                    <p className="text-sm font-bold text-gray-700">{formatCurrency(card.creditLimit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('cards', 'used')}</p>
                    <p className="text-sm font-bold text-gray-700">{formatCurrency(card.usedCredit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('cards', 'rewards')}</p>
                    <p className="text-sm font-bold" style={{ color: theme.accentColor }}>{card.rewardsPoints} {t('cards', 'pts')}</p>
                  </div>
                </div>
                {card.cyberInsurance && (
                  <div className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded mb-3 inline-block">
                    🛡️ {t('cards', 'cyberInsurance')}
                  </div>
                )}
                <button
                  onClick={() => toggleFreeze(card._id)}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                    card.status === 'frozen'
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  {card.status === 'frozen' ? `🔓 ${t('cards', 'unfreezeCard')}` : `🔒 ${t('cards', 'freezeCard')}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Card Application</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Card Type:</span>
                <span className="font-semibold">{confirmCard.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Credit Limit:</span>
                <span className="font-semibold">{confirmCard.limit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Annual Fee:</span>
                <span className="font-semibold">{confirmCard.fee}</span>
              </div>
              {confirmCard.insurance && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Cyber Insurance:</span>
                  <span className="font-semibold text-green-600">Included</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  applyForCard(confirmCard.type, confirmCard.insurance);
                  setConfirmCard(null);
                }}
                disabled={applying}
                className="flex-1 py-2 rounded-lg font-semibold disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}
              >
                {applying ? t('common', 'processing') : 'Confirm Application'}
              </button>
              <button
                onClick={() => setConfirmCard(null)}
                disabled={applying}
                className="flex-1 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply for Card */}
      {showApply && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('cards', 'chooseCard')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cardTypes.map((ct) => (
              <div key={ct.type} className="border border-gray-200 rounded-xl p-5 transition-all" style={{ ['--hover-border' as any]: theme.accentColor }}>
                <div className={`w-full h-20 rounded-lg bg-gradient-to-br ${ct.color} mb-4 flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{theme.logo} {ct.name}</span>
                </div>
                <p className="font-semibold text-gray-700">{ct.name} Card</p>
                <p className="text-sm text-gray-500 mb-1">{t('cards', 'creditLimit')}: {ct.limit}</p>
                <p className="text-sm text-gray-500 mb-4">{t('cards', 'annualFee')}: {ct.fee}</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setConfirmCard({ type: ct.type, name: ct.name, insurance: false, limit: ct.limit, fee: ct.fee })}
                    disabled={applying}
                    className="w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}
                  >
                    {t('common', 'apply')}
                  </button>
                  <button
                    onClick={() => setConfirmCard({ type: ct.type, name: ct.name, insurance: true, limit: ct.limit, fee: ct.fee })}
                    disabled={applying}
                    className="w-full py-2 rounded-lg text-sm font-medium border border-green-500 text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    {t('cards', 'applyWithInsurance')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cards.length === 0 && !showApply && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 mb-4">{t('cards', 'noCards')}</p>
          <button
            onClick={() => setShowApply(true)}
            className="px-6 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: theme.accentColor, color: theme.textOnPrimary }}
          >
            {t('cards', 'applyFirstCard')}
          </button>
        </div>
      )}
    </div>
  );
}
