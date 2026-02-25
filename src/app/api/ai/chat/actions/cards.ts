/**
 * @module api/ai/chat/actions/cards
 * @description Action handlers for credit card eligibility and issuance.
 */

import Card from '@/models/Card';
import { connectToDatabase } from '@/lib/mongodb';
import { generateCardNumber, generateCVV, generateExpiryDate } from '@/lib/helpers';
import { getCountryConfig } from '@/config';
import logger from '@/lib/logger';
import type { ActionResult } from '@/lib/types';

const log = logger.child({ module: 'cardAction' });

/** Handle CARD_CHECK_ELIGIBILITY action. */
export async function handleCardCheckEligibility(action: Record<string, unknown>): Promise<ActionResult> {
    const config = getCountryConfig();
    const sym = config.currency.symbol;
    const params = (action.params as Record<string, unknown>) || {};
    const { employment, income } = params as { employment?: string; income?: number };
    const annualIncome = Number(income) || 0;

    const cards: { type: string; limit: number; eligible: boolean; recommended: boolean }[] = [];
    cards.push({ type: 'standard', limit: config.cardLimits.standard, eligible: annualIncome >= 0, recommended: annualIncome < 60000 });
    cards.push({ type: 'gold', limit: config.cardLimits.gold, eligible: annualIncome >= 40000, recommended: annualIncome >= 60000 && annualIncome < 120000 });
    cards.push({ type: 'platinum', limit: config.cardLimits.platinum, eligible: annualIncome >= 80000, recommended: annualIncome >= 120000 });

    const eligibleCards = cards.filter((c) => c.eligible);
    const cardLines = eligibleCards.map((c) => `- **${c.type.charAt(0).toUpperCase() + c.type.slice(1)}** — ${sym}${c.limit.toLocaleString()} limit${c.recommended ? ' ✨ *Recommended*' : ''}`);

    return {
        text: `Based on your ${employment || 'employment'} status and annual income of ${sym}${annualIncome.toLocaleString()}, here are your eligible cards:\n\n${cardLines.join('\n')}\n\nWhich card would you like to apply for?`,
        type: 'card_eligibility',
        data: { employment, income: annualIncome, eligibleCards },
    };
}

/** Handle APPLY_CREDIT_CARD action. */
export async function handleApplyCreditCard(action: Record<string, unknown>, userId: string, accountNumber: string): Promise<ActionResult> {
    await connectToDatabase();
    const config = getCountryConfig();
    const sym = config.currency.symbol;
    const params = (action.params as Record<string, unknown>) || {};
    const { cardType, confirmed } = params as { cardType?: string; confirmed?: boolean };

    if (!cardType) return { text: 'Please specify a card type: **standard**, **gold**, or **platinum**.', type: 'pick_card' };
    if (!confirmed) return { text: `Please confirm you want to apply for the **${cardType}** card.`, type: 'card_confirm', data: { cardType } };

    const existingCard = await Card.findOne({ userId, cardType, status: { $ne: 'cancelled' } });
    if (existingCard) return { text: `You already have a **${cardType}** credit card.`, type: 'error' };

    const limitMap: Record<string, number> = { standard: config.cardLimits.standard, gold: config.cardLimits.gold, platinum: config.cardLimits.platinum };
    const creditLimit = limitMap[cardType] || config.cardLimits.standard;

    const card = await Card.create({ userId, accountNumber, cardNumber: generateCardNumber(), cardType, creditLimit, expiryDate: generateExpiryDate(), cvv: generateCVV() });

    log.info('Credit card issued', { userId, cardType, lastFour: card.cardNumber.slice(-4) });

    return {
        text: `Your **${cardType}** credit card has been issued! 🎉\n\n- **Card Number:** ****-****-****-${card.cardNumber.slice(-4)}\n- **Credit Limit:** ${sym}${card.creditLimit.toLocaleString()}\n- **Expiry:** ${card.expiryDate}\n- **Status:** Active`,
        type: 'card_issued',
        data: { cardType, lastFour: card.cardNumber.slice(-4), creditLimit: card.creditLimit },
    };
}
