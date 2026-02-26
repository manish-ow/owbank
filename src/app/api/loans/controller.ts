/**
 * @module api/loans/controller
 * @description Controller for personal loan operations.
 *
 * Handles:
 * - Listing user's loans
 * - Applying for new loans (with credit score simulation and auto-disbursement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthError } from '@/lib/middleware/authGuard';
import { connectToDatabase } from '@/lib/mongodb';
import Account from '@/models/Account';
import Loan from '@/models/Loan';
import Transaction from '@/models/Transaction';
import { calculateEMI, getInterestRate, generateReference } from '@/lib/helpers';
import { getCountryConfig } from '@/config';
import logger from '@/lib/logger';

const log = logger.child({ module: 'loansController' });

/**
 * GET /api/loans — list all loans for the authenticated user.
 */
export async function getLoans(): Promise<NextResponse> {
    try {
        const { user } = await withAuth();
        await connectToDatabase();
        const loans = await Loan.find({ userId: user._id });
        return NextResponse.json({ loans });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

/**
 * POST /api/loans — apply for a new personal loan.
 */
export async function applyLoan(req: NextRequest): Promise<NextResponse> {
    try {
        const { user, account } = await withAuth(req);
        await connectToDatabase();

        const { amount, tenure, purpose, creditScore } = await req.json();

        if (!amount || !tenure || !purpose) {
            return NextResponse.json({ error: 'Amount, tenure, and purpose are required' }, { status: 400 });
        }
        const config = getCountryConfig();
        const sym = config.currency.symbol;
        if (amount < 1000 || amount > 100000) {
            return NextResponse.json({ error: `Loan amount must be between ${sym}1,000 and ${sym}100,000` }, { status: 400 });
        }

        const score = creditScore || Math.floor(650 + Math.random() * 200);
        const interestRate = getInterestRate(score);
        const emiAmount = calculateEMI(amount, interestRate, tenure);
        const status = score >= 650 ? 'approved' : 'applied';

        const loan = await Loan.create({
            userId: user._id,
            accountNumber: account.accountNumber,
            amount,
            interestRate,
            tenure,
            emiAmount,
            purpose,
            status,
            creditScore: score,
            remainingAmount: amount,
        });

        if (status === 'approved') {
            account.balance += amount;
            await account.save();
            loan.status = 'disbursed';
            await loan.save();

            // Record the disbursement as a transaction
            await Transaction.create({
                reference: generateReference(),
                fromAccount: 'LOAN_DISBURSEMENT',
                toAccount: account.accountNumber,
                amount,
                type: 'deposit',
                status: 'completed',
                description: `Loan disbursement - ${purpose} (${tenure} months)`,
            });
        }

        log.info('Loan processed', { userId: user._id.toString(), amount, status: loan.status });

        return NextResponse.json({
            success: true,
            loan: {
                id: loan._id,
                amount: loan.amount,
                interestRate: loan.interestRate,
                tenure: loan.tenure,
                emiAmount: loan.emiAmount,
                status: loan.status,
                creditScore: loan.creditScore,
            },
            message: status === 'approved'
                ? `Loan of ${sym}${amount.toFixed(2)} approved and disbursed! EMI: ${sym}${emiAmount}/month`
                : 'Loan application submitted for review.',
        });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
