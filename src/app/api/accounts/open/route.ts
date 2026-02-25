import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import { generateReference } from '@/lib/helpers';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.hasAccount) {
      return NextResponse.json({ error: 'Account already exists' }, { status: 400 });
    }

    const body = await req.json();
    const { fullName, dateOfBirth, phone, address, accountType } = body;

    if (!fullName || !phone) {
      return NextResponse.json({ error: 'Full name and phone are required' }, { status: 400 });
    }

    // Generate account number
    const count = await Account.countDocuments();
    const accountNumber = `OW${String(count + 10001).padStart(5, '0')}`;

    // Create account with $1000 bonus
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

    // Record welcome bonus transaction
    await Transaction.create({
      reference: generateReference(),
      fromAccount: 'SYSTEM',
      toAccount: accountNumber,
      amount: 1000,
      type: 'bonus',
      status: 'completed',
      description: 'Welcome bonus - New account opening',
    });

    // Update user
    user.hasAccount = true;
    await user.save();

    return NextResponse.json({
      success: true,
      account: {
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        balance: account.balance,
        fullName: account.fullName,
      },
      message: 'Account opened successfully! $1,000 welcome bonus credited.',
    });
  } catch (error: any) {
    console.error('Account opening error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
