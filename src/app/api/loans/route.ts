import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Account from '@/models/Account';
import Loan from '@/models/Loan';
import { calculateEMI, getInterestRate } from '@/lib/helpers';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const loans = await Loan.find({ userId: user._id });
    return NextResponse.json({ loans });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const account = await Account.findOne({ userId: user._id });
    if (!account) return NextResponse.json({ error: 'No account found' }, { status: 404 });

    const { amount, tenure, purpose, creditScore } = await req.json();

    if (!amount || !tenure || !purpose) {
      return NextResponse.json({ error: 'Amount, tenure, and purpose are required' }, { status: 400 });
    }

    if (amount < 1000 || amount > 100000) {
      return NextResponse.json({ error: 'Loan amount must be between $1,000 and $100,000' }, { status: 400 });
    }

    // Simulate credit score if not provided
    const score = creditScore || Math.floor(650 + Math.random() * 200);
    const interestRate = getInterestRate(score);
    const emiAmount = calculateEMI(amount, interestRate, tenure);

    // Auto-approve if credit score >= 650
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

    // If approved, disburse to account
    if (status === 'approved') {
      account.balance += amount;
      await account.save();
      loan.status = 'disbursed';
      await loan.save();
    }

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
        ? `Loan of $${amount.toFixed(2)} approved and disbursed! EMI: $${emiAmount}/month`
        : 'Loan application submitted for review.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
