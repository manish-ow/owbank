import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';

export async function GET(req: NextRequest) {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
