/**
 * @module api/transactions/controller
 * @description Controller for transaction operations.
 *
 * Handles:
 * - Listing transaction history
 * - Executing intra-bank transfers (with Kafka events and atomic DB updates)
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withAuth, AuthError } from '@/lib/middleware/authGuard';
import { connectToDatabase } from '@/lib/mongodb';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import { generateReference } from '@/lib/helpers';
import { publishTransactionEvent } from '@/lib/kafka';
import logger from '@/lib/logger';

const log = logger.child({ module: 'transactionsController' });

/**
 * GET /api/transactions — fetch the authenticated user's transaction history.
 */
export async function getTransactions(req: NextRequest): Promise<NextResponse> {
    try {
        const { account } = await withAuth(req);
        await connectToDatabase();

        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
        const transactions = await Transaction.find({
            $or: [
                { fromAccount: account.accountNumber },
                { toAccount: account.accountNumber },
            ],
        })
            .sort({ createdAt: -1 })
            .limit(limit);

        return NextResponse.json({ transactions, accountNumber: account.accountNumber });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

/**
 * POST /api/transactions/transfer — execute an intra-bank transfer.
 */
export async function transfer(req: NextRequest): Promise<NextResponse> {
    try {
        const { account: senderAccount } = await withAuth(req);
        await connectToDatabase();

        const { toAccount, amount, description } = await req.json();

        if (!toAccount || !amount) {
            return NextResponse.json({ error: 'Recipient account and amount are required' }, { status: 400 });
        }
        if (amount <= 0) {
            return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
        }
        if (senderAccount.accountNumber === toAccount) {
            return NextResponse.json({ error: 'Cannot transfer to same account' }, { status: 400 });
        }
        if (senderAccount.balance < amount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }
        if (senderAccount.status !== 'active') {
            return NextResponse.json({ error: 'Account is not active' }, { status: 400 });
        }

        const recipientAccount = await Account.findOne({ accountNumber: toAccount });
        if (!recipientAccount) {
            return NextResponse.json({ error: 'Recipient account not found' }, { status: 404 });
        }
        if (recipientAccount.status !== 'active') {
            return NextResponse.json({ error: 'Recipient account is not active' }, { status: 400 });
        }

        const reference = generateReference();

        try {
            await publishTransactionEvent({
                type: 'TRANSFER_INITIATED',
                fromAccount: senderAccount.accountNumber,
                toAccount,
                amount,
                reference,
                timestamp: new Date().toISOString(),
            });
        } catch (kafkaError) {
            log.warn('Kafka publish failed (continuing)', { reference, error: (kafkaError as Error).message });
        }

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        try {
            senderAccount.balance -= amount;
            recipientAccount.balance += amount;
            await senderAccount.save({ session: dbSession });
            await recipientAccount.save({ session: dbSession });
            await dbSession.commitTransaction();
        } catch (txError) {
            await dbSession.abortTransaction();
            throw txError;
        } finally {
            dbSession.endSession();
        }

        const transaction = await Transaction.create({
            reference,
            fromAccount: senderAccount.accountNumber,
            toAccount,
            amount,
            type: 'transfer',
            status: 'completed',
            description: description || `Transfer to ${toAccount}`,
        });

        try {
            await publishTransactionEvent({
                type: 'TRANSFER_COMPLETED',
                fromAccount: senderAccount.accountNumber,
                toAccount,
                amount,
                reference,
                timestamp: new Date().toISOString(),
            });
        } catch (kafkaError) {
            log.warn('Kafka completion publish failed', { reference, error: (kafkaError as Error).message });
        }

        log.info('Transfer completed', { reference, from: senderAccount.accountNumber, to: toAccount, amount });

        return NextResponse.json({
            success: true,
            transaction: {
                reference: transaction.reference,
                amount: transaction.amount,
                toAccount: transaction.toAccount,
                status: transaction.status,
                createdAt: transaction.createdAt,
            },
            newBalance: senderAccount.balance,
            message: `Successfully transferred $${amount.toFixed(2)} to ${toAccount}`,
        });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        log.error('Transfer error', { error: (error as Error).message });
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
