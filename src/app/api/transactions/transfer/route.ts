import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import { generateReference } from '@/lib/helpers';
import { publishTransactionEvent } from '@/lib/kafka';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const senderAccount = await Account.findOne({ userId: user._id });
    if (!senderAccount) return NextResponse.json({ error: 'No account found' }, { status: 404 });

    const { toAccount, amount, description } = await req.json();

    // Validations
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

    // Find recipient
    const recipientAccount = await Account.findOne({ accountNumber: toAccount });
    if (!recipientAccount) {
      return NextResponse.json({ error: 'Recipient account not found' }, { status: 404 });
    }

    if (recipientAccount.status !== 'active') {
      return NextResponse.json({ error: 'Recipient account is not active' }, { status: 400 });
    }

    const reference = generateReference();

    // Publish to Kafka
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
      console.warn('Kafka publish failed (continuing without):', kafkaError);
      // Continue even if Kafka is unavailable - this is a prototype
    }

    // Execute transfer atomically inside a Mongoose session
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

    // Record transaction
    const transaction = await Transaction.create({
      reference,
      fromAccount: senderAccount.accountNumber,
      toAccount,
      amount,
      type: 'transfer',
      status: 'completed',
      description: description || `Transfer to ${toAccount}`,
    });

    // Publish completion to Kafka
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
      console.warn('Kafka completion publish failed:', kafkaError);
    }

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
  } catch (error: any) {
    console.error('Transfer error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
