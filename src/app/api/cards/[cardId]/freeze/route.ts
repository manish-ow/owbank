import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Card from '@/models/Card';

export async function POST(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { cardId } = await params;
    const card = await Card.findOne({ _id: cardId, userId: user._id });
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    card.status = card.status === 'frozen' ? 'active' : 'frozen';
    await card.save();

    return NextResponse.json({
      success: true,
      status: card.status,
      message: `Card ${card.status === 'frozen' ? 'frozen' : 'unfrozen'} successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
