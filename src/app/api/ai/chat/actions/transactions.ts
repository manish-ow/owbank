/**
 * @module api/ai/chat/actions/transactions
 * @description Action handler for retrieving transaction history.
 */

import Transaction from '@/models/Transaction';
import { connectToDatabase } from '@/lib/mongodb';
import { getCountryConfig } from '@/config';
import type { ActionResult } from '@/lib/types';

/** Handle GET_TRANSACTIONS action. */
export async function handleGetTransactions(
    action: Record<string, unknown>,
    _userId: string,
    accountNumber: string,
): Promise<ActionResult> {
    await connectToDatabase();
    const config = getCountryConfig();
    const sym = config.currency.symbol;

    const params = (action.params as Record<string, unknown>) || {};
    const limit = (params.limit as number) || 5;

    const transactions = await Transaction.find({
        $or: [{ fromAccount: accountNumber }, { toAccount: accountNumber }],
    })
        .sort({ createdAt: -1 })
        .limit(limit);

    if (transactions.length === 0) {
        return { text: 'No recent transactions found.', type: 'transactions', data: { transactions: [] } };
    }

    const txList = transactions.map((t) => {
        const isSender = t.fromAccount === accountNumber;
        const sign = t.type === 'bonus' || !isSender ? '+' : '-';
        return `- ${sign}${sym}${t.amount.toFixed(2)} — ${t.description} (${new Date(t.createdAt).toLocaleDateString()})`;
    });

    return { text: `Here are your recent transactions:\n\n${txList.join('\n')}`, type: 'transactions', data: { count: transactions.length } };
}
