/**
 * @module api/ai/chat/actionDispatcher
 * @description Central action dispatcher routing parsed AI actions to domain handlers.
 */

import { handleGetBalance, handleGetCreditScore } from './actions/balance';
import { handleGetTransactions } from './actions/transactions';
import { handleTransferInitiate, handleTransferConfirm } from './actions/transfer';
import { handleCardCheckEligibility, handleApplyCreditCard } from './actions/cards';
import { handleLoanCheckCreditScore, handleLoanConfirm, handleLoanPayslipVerify } from './actions/loans';
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
        case 'TRANSFER_INITIATE': return handleTransferInitiate(action, userId, accountNumber);
        case 'TRANSFER_CONFIRM': return handleTransferConfirm(action, userId, accountNumber);
        case 'TRANSFER': return handleTransferInitiate(action, userId, accountNumber); // Fallback for old action type
        case 'CARD_CHECK_ELIGIBILITY': return handleCardCheckEligibility(action);
        case 'APPLY_CREDIT_CARD': return handleApplyCreditCard(action, userId, accountNumber);
        case 'LOAN_CHECK_CREDIT_SCORE': return handleLoanCheckCreditScore(action, userId, accountNumber);
        case 'LOAN_VERIFY_PAYSLIP': return handleLoanPayslipVerify(action, userId, accountNumber);
        case 'LOAN_CONFIRM': return handleLoanConfirm(action, userId, accountNumber);
        case 'GET_CREDIT_SCORE': return handleGetCreditScore(action, userId, accountNumber);
        default:
            log.warn('Unknown action type', { actionType });
            return { text: 'I could not process that action. Please try again.', type: 'error' };
    }
}
