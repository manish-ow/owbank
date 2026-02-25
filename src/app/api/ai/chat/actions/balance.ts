/**
 * @module api/ai/chat/actions/balance
 * @description Action handlers for account balance and credit score queries.
 */

import Account from '@/models/Account';
import { connectToDatabase } from '@/lib/mongodb';
import { getCountryConfig } from '@/config';
import type { ActionResult } from '@/lib/types';

/** Handle GET_BALANCE action. */
export async function handleGetBalance(
    _action: Record<string, unknown>,
    _userId: string,
    accountNumber: string,
): Promise<ActionResult> {
    await connectToDatabase();
    const config = getCountryConfig();
    const sym = config.currency.symbol;

    const account = await Account.findOne({ accountNumber });
    if (!account) return { text: 'Account not found.', type: 'error' };

    return {
        text: `Your **${account.accountType}** account (**${account.accountNumber}**) has a balance of **${sym}${account.balance.toFixed(2)}**.`,
        type: 'balance',
        data: { balance: account.balance, accountNumber: account.accountNumber, accountType: account.accountType },
    };
}

/** Handle GET_CREDIT_SCORE action. */
export async function handleGetCreditScore(): Promise<ActionResult> {
    const score = Math.floor(650 + Math.random() * 200);
    let rating = 'Fair';
    if (score >= 800) rating = 'Excellent';
    else if (score >= 720) rating = 'Good';
    else if (score >= 650) rating = 'Fair';
    else rating = 'Poor';

    return { text: `Your credit score is **${score}** (${rating}).`, type: 'credit_score', data: { score, rating } };
}
