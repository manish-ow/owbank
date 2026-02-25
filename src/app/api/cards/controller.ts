/**
 * @module api/cards/controller
 * @description Controller for credit card operations.
 *
 * Handles:
 * - Listing user's credit cards
 * - Applying for new credit cards
 * - Freezing / unfreezing cards
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthError } from '@/lib/middleware/authGuard';
import { connectToDatabase } from '@/lib/mongodb';
import Card from '@/models/Card';
import { generateCardNumber, generateCVV, generateExpiryDate, getCreditLimit } from '@/lib/helpers';
import logger from '@/lib/logger';

const log = logger.child({ module: 'cardsController' });

/**
 * GET /api/cards — list all credit cards for the authenticated user.
 */
export async function getCards(): Promise<NextResponse> {
    try {
        const { user } = await withAuth();
        await connectToDatabase();
        const cards = await Card.find({ userId: user._id });
        return NextResponse.json({ cards });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

/**
 * POST /api/cards — apply for a new credit card.
 */
export async function applyCard(req: NextRequest): Promise<NextResponse> {
    try {
        const { user, account } = await withAuth(req);
        await connectToDatabase();

        const { cardType, cyberInsurance } = await req.json();

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

        log.info('Card applied', { userId: user._id.toString(), cardType: card.cardType });

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
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

/**
 * POST /api/cards/[cardId]/freeze — toggle freeze/unfreeze on a card.
 */
export async function toggleFreeze(cardId: string): Promise<NextResponse> {
    try {
        const { user } = await withAuth();
        await connectToDatabase();

        const card = await Card.findOne({ _id: cardId, userId: user._id });
        if (!card) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        card.status = card.status === 'frozen' ? 'active' : 'frozen';
        await card.save();

        log.info('Card freeze toggled', { cardId, newStatus: card.status });

        return NextResponse.json({
            success: true,
            status: card.status,
            message: `Card ${card.status === 'frozen' ? 'frozen' : 'unfrozen'} successfully`,
        });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
