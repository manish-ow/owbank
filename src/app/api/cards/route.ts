import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Account from '@/models/Account';
import Card from '@/models/Card';
import { generateCardNumber, generateCVV, generateExpiryDate, getCreditLimit } from '@/lib/helpers';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const cards = await Card.find({ userId: user._id });
    return NextResponse.json({ cards });
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

    const { cardType, cyberInsurance } = await req.json();

    // Check if user already has this card type
    const existingCard = await Card.findOne({
      userId: user._id,
      cardType,
      status: { $ne: 'cancelled' },
    });
    if (existingCard) {
      return NextResponse.json({ error: `You already have a ${cardType} card` }, { status: 400 });
    }

    const card = await Card.create({
      userId: user._id,
      accountNumber: account.accountNumber,
      cardNumber: generateCardNumber(),
      cardType: cardType || 'standard',
      creditLimit: getCreditLimit(cardType || 'standard'),
      expiryDate: generateExpiryDate(),
      cvv: generateCVV(),
      cyberInsurance: cyberInsurance || false,
    });

    return NextResponse.json({
      success: true,
      card: {
        cardNumber: `****-****-****-${card.cardNumber.slice(-4)}`,
        cardType: card.cardType,
        creditLimit: card.creditLimit,
        expiryDate: card.expiryDate,
        cyberInsurance: card.cyberInsurance,
        status: card.status,
      },
      message: `${cardType || 'standard'} credit card issued successfully!`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
