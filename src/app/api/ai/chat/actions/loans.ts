/**
 * @module api/ai/chat/actions/loans
 * @description Action handlers for loan credit checks, offers, and confirmation.
 */

import Account from '@/models/Account';
import Loan from '@/models/Loan';
import Transaction from '@/models/Transaction';
import { connectToDatabase } from '@/lib/mongodb';
import { calculateEMI, getInterestRate, generateReference } from '@/lib/helpers';
import { getCountryConfig } from '@/config';
import logger from '@/lib/logger';
import type { ActionResult } from '@/lib/types';

const log = logger.child({ module: 'loanAction' });

/** Handle LOAN_CHECK_CREDIT_SCORE action. */
export async function handleLoanCheckCreditScore(action: Record<string, unknown>): Promise<ActionResult> {
    const config = getCountryConfig();
    const sym = config.currency.symbol;
    const params = (action.params as Record<string, unknown>) || {};
    const { amount: reqAmount, tenure: reqTenure, purpose: reqPurpose, income: reqIncome } = params as { amount?: number; tenure?: number; purpose?: string; income?: number };

    const loanAmt = Number(reqAmount) || 0;
    const loanTenure = Number(reqTenure) || 12;
    const loanIncome = Number(reqIncome) || 0;

    if (loanAmt < config.loanSettings.minAmount || loanAmt > config.loanSettings.maxAmount) {
        return { text: `Loan amount must be between ${sym}${config.loanSettings.minAmount.toLocaleString()} and ${sym}${config.loanSettings.maxAmount.toLocaleString()}.`, type: 'error' };
    }

    const score = Math.floor(650 + Math.random() * 200);
    let rating = 'Fair';
    if (score >= 800) rating = 'Excellent';
    else if (score >= 720) rating = 'Good';
    else if (score >= 650) rating = 'Fair';
    else rating = 'Poor';

    const rate = getInterestRate(score);
    const emi = calculateEMI(loanAmt, rate, loanTenure);
    const totalRepayment = Math.round(emi * loanTenure);

    return {
        text: `Your credit score is **${score}** (${rating}).\n\nLoan offer:\n\n- **Amount:** ${sym}${loanAmt.toLocaleString()}\n- **Interest Rate:** ${rate}%\n- **Tenure:** ${loanTenure} months\n- **EMI:** ${sym}${emi.toLocaleString()}/month\n- **Total Repayment:** ${sym}${totalRepayment.toLocaleString()}\n\nWould you like to accept this offer?`,
        type: 'loan_offer',
        data: { score, rating, rate, emi, totalRepayment, amount: loanAmt, tenure: loanTenure, purpose: reqPurpose, income: loanIncome },
    };
}

/** Handle LOAN_CONFIRM action. */
export async function handleLoanConfirm(action: Record<string, unknown>, userId: string, accountNumber: string): Promise<ActionResult> {
    await connectToDatabase();
    const config = getCountryConfig();
    const sym = config.currency.symbol;
    const params = (action.params as Record<string, unknown>) || {};
    const { amount: loanAmount, tenure, purpose, creditScore, interestRate, emi, income } = params as {
        amount?: number; tenure?: number; purpose?: string; creditScore?: number; interestRate?: number; emi?: number; income?: number;
    };

    if (!loanAmount) return { text: 'Missing loan amount.', type: 'error' };

    const finalTenure = tenure || 12;
    const finalPurpose = purpose || 'Personal';
    const score = creditScore || Math.floor(650 + Math.random() * 200);
    const rate = interestRate || getInterestRate(score);
    const finalEmi = emi || calculateEMI(loanAmount, rate, finalTenure);
    const status = score >= 650 ? 'approved' : 'applied';

    const loan = await Loan.create({ userId, accountNumber, amount: loanAmount, interestRate: rate, tenure: finalTenure, emiAmount: finalEmi, purpose: finalPurpose, status, creditScore: score, remainingAmount: loanAmount });

    if (status === 'approved') {
        const account = await Account.findOne({ accountNumber });
        if (account) {
            account.balance += loanAmount;
            await account.save();
            loan.status = 'disbursed' as any;
            await loan.save();

            // Record the disbursement as a transaction
            await Transaction.create({
                reference: generateReference(),
                fromAccount: 'LOAN_DISBURSEMENT',
                toAccount: accountNumber,
                amount: loanAmount,
                type: 'deposit',
                status: 'completed',
                description: `Loan disbursement - ${finalPurpose} (${finalTenure} months)`,
            });
        }
    }

    const wasDisbursed = loan.status === ('disbursed' as any) || status === 'approved';
    log.info('Loan processed', { userId, amount: loanAmount, status: loan.status });

    return {
        text: `Loan **${wasDisbursed ? 'approved and disbursed' : status}**! 🎉\n\n- **Amount:** ${sym}${loanAmount.toLocaleString()}\n- **Interest Rate:** ${rate}%\n- **Tenure:** ${finalTenure} months\n- **EMI:** ${sym}${finalEmi.toLocaleString()}/month\n- **Credit Score:** ${score}${wasDisbursed ? `\n\n${sym}${loanAmount.toLocaleString()} has been **credited** to your account.` : ''}`,
        type: 'loan_result',
        data: { amount: loanAmount, rate, tenure: finalTenure, emi: finalEmi, score, status: wasDisbursed ? 'disbursed' : status, income },
    };
}
