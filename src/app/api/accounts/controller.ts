/**
 * @module api/accounts/controller
 * @description Controller for account management operations.
 *
 * Handles:
 * - Listing user accounts
 * - Updating account currency
 * - Opening new bank accounts (with welcome bonus)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthError } from '@/lib/middleware/authGuard';
import { connectToDatabase } from '@/lib/mongodb';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import { generateReference } from '@/lib/helpers';
import { formatCurrency } from '@/config';
import logger from '@/lib/logger';

const log = logger.child({ module: 'accountsController' });

/**
 * GET /api/accounts — retrieve all accounts for the authenticated user.
 */
export async function getAccounts(): Promise<NextResponse> {
    try {
        const { user } = await withAuth();
        await connectToDatabase();
        const accounts = await Account.find({ userId: user._id });
        return NextResponse.json({ accounts });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

/**
 * PATCH /api/accounts — update the currency on the user's primary account.
 */
export async function updateCurrency(req: NextRequest): Promise<NextResponse> {
    try {
        const { user } = await withAuth(req);
        const { currency } = await req.json();

        if (!currency) {
            return NextResponse.json({ error: 'Currency code is required' }, { status: 400 });
        }

        await connectToDatabase();
        const account = await Account.findOneAndUpdate(
            { userId: user._id },
            { $set: { currency } },
            { new: true },
        );
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        log.info('Currency updated', { userId: user._id.toString(), currency });
        return NextResponse.json({ success: true, currency: account.currency });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

/**
 * POST /api/accounts/open — open a new bank account for the authenticated user.
 */
export async function openAccount(req: NextRequest): Promise<NextResponse> {
    try {
        const { user } = await withAuth(req, false);
        await connectToDatabase();

        if (user.hasAccount) {
            return NextResponse.json({ error: 'Account already exists' }, { status: 400 });
        }

        const body = await req.json();
        const { fullName, dateOfBirth, phone, address, accountType } = body;

        if (!fullName || !phone) {
            return NextResponse.json({ error: 'Full name and phone are required' }, { status: 400 });
        }

        const count = await Account.countDocuments();
        const accountNumber = `OW${String(count + 10001).padStart(5, '0')}`;

        const account = await Account.create({
            userId: user._id,
            accountNumber,
            accountType: accountType || 'savings',
            balance: 1000,
            fullName,
            dateOfBirth,
            phone,
            address,
            kycVerified: false,
        });

        await Transaction.create({
            reference: generateReference(),
            fromAccount: 'SYSTEM',
            toAccount: accountNumber,
            amount: 1000,
            type: 'bonus',
            status: 'completed',
            description: 'Welcome bonus - New account opening',
        });

        user.hasAccount = true;
        await user.save();

        log.info('Account opened', { userId: user._id.toString(), accountNumber });

        return NextResponse.json({
            success: true,
            account: {
                accountNumber: account.accountNumber,
                accountType: account.accountType,
                balance: account.balance,
                fullName: account.fullName,
            },
            message: `Account opened successfully! ${formatCurrency(1000)} welcome bonus credited.`,
        });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        log.error('Account opening error', { error: (error as Error).message });
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
