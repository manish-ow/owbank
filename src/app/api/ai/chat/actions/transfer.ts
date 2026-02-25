/**
 * @module api/ai/chat/actions/transfer
 * @description Action handler for intra-bank money transfers.
 */

import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import { connectToDatabase } from '@/lib/mongodb';
import { generateReference } from '@/lib/helpers';
import { publishTransactionEvent } from '@/lib/kafka';
import { getCountryConfig } from '@/config';
import logger from '@/lib/logger';
import type { ActionResult } from '@/lib/types';

const log = logger.child({ module: 'transferAction' });

/** Handle TRANSFER action. */
export async function handleTransfer(
    action: Record<string, unknown>,
    _userId: string,
    accountNumber: string,
): Promise<ActionResult> {
    await connectToDatabase();
    const config = getCountryConfig();
    const sym = config.currency.symbol;
    const params = (action.params as Record<string, unknown>) || {};
    const { toAccount, amount, description } = params as { toAccount: string; amount: number; description?: string };

    if (!toAccount || !amount) return { text: 'Please provide both a recipient account number and amount.', type: 'error' };

    const senderAccount = await Account.findOne({ accountNumber });
    if (!senderAccount) return { text: 'Your account was not found.', type: 'error' };
    if (senderAccount.balance < amount) return { text: `Insufficient balance. Your current balance is **${sym}${senderAccount.balance.toFixed(2)}**.`, type: 'error' };
    if (toAccount === accountNumber) return { text: 'You cannot transfer to your own account.', type: 'error' };

    const recipientAccount = await Account.findOne({ accountNumber: toAccount });
    if (!recipientAccount) return { text: `Recipient account **${toAccount}** not found.`, type: 'error' };

    const reference = generateReference();

    try {
        await publishTransactionEvent({ type: 'TRANSFER_INITIATED', fromAccount: accountNumber, toAccount, amount, reference, timestamp: new Date().toISOString() });
    } catch (e) {
        log.warn('Kafka publish failed, continuing', { reference, error: (e as Error).message });
    }

    senderAccount.balance -= amount;
    recipientAccount.balance += amount;
    await senderAccount.save();
    await recipientAccount.save();

    await Transaction.create({ reference, fromAccount: accountNumber, toAccount, amount, type: 'transfer', status: 'completed', description: description || `Transfer to ${toAccount}` });

    log.info('Transfer completed', { reference, from: accountNumber, to: toAccount, amount });

    return {
        text: `Transfer successful!\n\n- **Amount:** ${sym}${amount.toFixed(2)}\n- **To:** ${toAccount}\n- **Reference:** ${reference}\n- **New Balance:** ${sym}${senderAccount.balance.toFixed(2)}`,
        type: 'transfer_success',
        data: { amount, toAccount, reference, newBalance: senderAccount.balance },
    };
}
