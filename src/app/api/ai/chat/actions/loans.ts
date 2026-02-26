/**
 * @module api/ai/chat/actions/loans
 * @description Action handlers for loan credit checks, offers, and confirmation.
 * GenZ-friendly flow with payslip verification and credit check visualization.
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
export async function handleLoanCheckCreditScore(action: Record<string, unknown>, userId: string, accountNumber: string): Promise<ActionResult> {
    await connectToDatabase();
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

    const existingLoan = await Loan.findOne({ accountNumber }).sort({ createdAt: -1 });
    const score = existingLoan?.creditScore || Math.floor(650 + Math.random() * 200);
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

/** Handle LOAN_VERIFY_PAYSLIP action — simulates payslip verification + credit check. */
export async function handleLoanPayslipVerify(action: Record<string, unknown>, userId: string, accountNumber: string): Promise<ActionResult> {
    await connectToDatabase();
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

    // Simulate credit check
    const existingLoan = await Loan.findOne({ accountNumber }).sort({ createdAt: -1 });
    const score = existingLoan?.creditScore || Math.floor(650 + Math.random() * 200);
    let rating = 'Fair';
    if (score >= 800) rating = 'Excellent';
    else if (score >= 720) rating = 'Good';
    else if (score >= 650) rating = 'Fair';
    else rating = 'Poor';

    const rate = getInterestRate(score);
    // Simulate slight adjustment — may approve slightly less than requested
    const approvedAmount = score >= 720 ? loanAmt : Math.round(loanAmt * 0.9);
    const emi = calculateEMI(approvedAmount, rate, loanTenure);
    const totalRepayment = Math.round(emi * loanTenure);

    return {
        text: `✅ **Payslip verified!**\n🔍 **Credit check complete** — Score: **${score}** (${rating})\n\nGreat news! Here's your offer:\n\n- **Approved Amount:** ${sym}${approvedAmount.toLocaleString()}\n- **Interest Rate:** ${rate}%\n- **Tenure:** ${loanTenure} months\n- **Monthly Payment:** ${sym}${emi.toLocaleString()}/month\n- **Total Repayment:** ${sym}${totalRepayment.toLocaleString()}\n\nWant to lock this in? 🔥`,
        type: 'loan_credit_check',
        data: {
            score, rating, rate, emi, totalRepayment,
            amount: approvedAmount, requestedAmount: loanAmt,
            tenure: loanTenure, purpose: reqPurpose, income: loanIncome,
            steps: [
                { label: 'Payslip verified', status: 'done' },
                { label: 'Credit check passed', status: 'done' },
                { label: 'Offer generated', status: 'done' },
            ],
        },
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
        text: wasDisbursed
            ? `🎉 **DING! You just got ${sym}${loanAmount.toLocaleString()}!** 🎉\n\nThe money is in your account right now. Go get those ${finalPurpose.toLowerCase()}! 🔥\n\n- **Amount:** ${sym}${loanAmount.toLocaleString()}\n- **Monthly Payment:** ${sym}${finalEmi.toLocaleString()}/month\n- **Tenure:** ${finalTenure} months\n- **Rate:** ${rate}%`
            : `Loan application **${status}**.\n\n- **Amount:** ${sym}${loanAmount.toLocaleString()}\n- **Rate:** ${rate}%\n- **Tenure:** ${finalTenure} months\n- **EMI:** ${sym}${finalEmi.toLocaleString()}/month`,
        type: 'loan_result',
        data: { amount: loanAmount, rate, tenure: finalTenure, emi: finalEmi, score, status: wasDisbursed ? 'disbursed' : status, income, purpose: finalPurpose, celebrate: wasDisbursed },
    };
}
