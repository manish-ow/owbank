/**
 * @module api/ai/chat/history
 * @description GET /api/ai/chat/history — Return the last 20 chat messages for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthError } from '@/lib/middleware/authGuard';
import { connectToDatabase } from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';
import logger from '@/lib/logger';

const log = logger.child({ module: 'chatHistory' });

export async function GET(req: NextRequest) {
    try {
        const { user } = await withAuth(req);
        await connectToDatabase();

        const session = await ChatHistory.findOne(
            { userId: user._id, sessionType: 'banking' },
        ).sort({ updatedAt: -1 });

        if (!session || !session.messages.length) {
            return NextResponse.json({ messages: [] });
        }

        // Return the last 20 messages
        const recent = session.messages.slice(-20);

        return NextResponse.json({ messages: recent });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        const err = error as Error;
        log.error('Failed to fetch chat history', { error: err.message });
        return NextResponse.json({ error: 'Failed to load chat history' }, { status: 500 });
    }
}
