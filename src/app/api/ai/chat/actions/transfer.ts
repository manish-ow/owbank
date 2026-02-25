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

/** Handle TRANSFER_INITIATE action - Validates and returns confirmation prompt. */
export async function handleTransferInitiate(
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

    // Return confirmation prompt with transfer details
    return {
        text: `Ready to transfer **${sym}${amount.toFixed(2)}** to account **${toAccount}**${description ? ` for "${description}"` : ''}.\n\nYour new balance will be **${sym}${(senderAccount.balance - amount).toFixed(2)}**.\n\n**Confirm this transfer?** (Reply "yes" or "confirm")`,
        type: 'transfer_confirmation',
        data: { toAccount, amount, description, pendingTransfer: true },
    };
}

/** Handle TRANSFER_CONFIRM action - Executes the confirmed transfer. */
export async function handleTransferConfirm(
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

    // Perform the actual transfer logic in the background (no await)
    // so it doesn't block the AI response time.
    (async () => {
        try {
            // Fire-and-forget Kafka publish (don't await to avoid blocking)
            publishTransactionEvent({
                type: 'TRANSFER_INITIATED',
                fromAccount: accountNumber,
                toAccount,
                amount,
                reference,
                timestamp: new Date().toISOString()
            }).catch(e => log.warn('Kafka publish failed, continuing', { reference, error: (e as Error).message }));

            senderAccount.balance -= amount;
            recipientAccount.balance += amount;
            await senderAccount.save();
            await recipientAccount.save();

            await Transaction.create({
                reference,
                fromAccount: accountNumber,
                toAccount,
                amount,
                type: 'transfer',
                status: 'completed',
                description: description || `Transfer to ${toAccount}`
            });

            log.info('Background transfer completed', { reference, from: accountNumber, to: toAccount, amount });
        } catch (error) {
            log.error('Background transfer failed', { reference, error: (error as Error).message });
        }
    })();

    return {
        text: `Bank transfer **submitted**! 📤\n\n- **Amount:** ${sym}${amount.toFixed(2)}\n- **To:** ${toAccount}\n- **Reference:** ${reference}\n\nYour transfer is being processed in the background. Your balance will be updated shortly.`,
        type: 'transfer_success',
        data: { amount, toAccount, reference, status: 'submitted' },
    };
}
