/**
 * @module api/ai/chat/actionDispatcher
 * @description Central action dispatcher routing parsed AI actions to domain handlers.
 */

import { handleGetBalance, handleGetCreditScore } from './actions/balance';
import { handleGetTransactions } from './actions/transactions';
import { handleTransfer } from './actions/transfer';
import { handleCardCheckEligibility, handleApplyCreditCard } from './actions/cards';
import { handleLoanCheckCreditScore, handleLoanConfirm } from './actions/loans';
import logger from '@/lib/logger';
import type { ActionResult } from '@/lib/types';

const log = logger.child({ module: 'actionDispatcher' });

/**
 * Dispatch a parsed action to the correct handler.
 */
export async function executeAction(
    action: Record<string, unknown>,
    userId: string,
    accountNumber: string,
): Promise<ActionResult> {
    const actionType = action.action as string;
    log.debug('Dispatching action', { actionType, userId });

    switch (actionType) {
        case 'GET_BALANCE': return handleGetBalance(action, userId, accountNumber);
        case 'GET_TRANSACTIONS': return handleGetTransactions(action, userId, accountNumber);
        case 'TRANSFER': return handleTransfer(action, userId, accountNumber);
        case 'CARD_CHECK_ELIGIBILITY': return handleCardCheckEligibility(action);
        case 'APPLY_CREDIT_CARD': return handleApplyCreditCard(action, userId, accountNumber);
        case 'LOAN_CHECK_CREDIT_SCORE': return handleLoanCheckCreditScore(action);
        case 'LOAN_CONFIRM': return handleLoanConfirm(action, userId, accountNumber);
        case 'GET_CREDIT_SCORE': return handleGetCreditScore();
        default:
            log.warn('Unknown action type', { actionType });
            return { text: 'I could not process that action. Please try again.', type: 'error' };
    }
}
