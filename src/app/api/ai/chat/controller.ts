/**
 * @module api/ai/chat/controller
 * @description Banking chat controller — orchestrates the full AI chat lifecycle.
 *
 * All dependencies are co-located in this domain folder:
 * service.ts, actionParser.ts, actionDispatcher.ts, suggestedActions.ts, prompts/, actions/
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthError } from '@/lib/middleware/authGuard';
import { connectToDatabase } from '@/lib/mongodb';
import { chatWithGemini } from './service';
import { extractActionJson, cleanAiResponse } from './actionParser';
import { executeAction } from './actionDispatcher';
import { getSuggestedActions } from './suggestedActions';
import { getServerThemeConfig } from '@/theme/themes';
import logger from '@/lib/logger';

const log = logger.child({ module: 'chatController' });

const NON_BANKING_PATTERNS: RegExp[] = [
    /\b(joke|funny|humor|laugh)\b/,
    /\b(recipe|cook|bake|ingredient)\b/,
    /\b(weather|forecast|temperature)\b/,
    /\b(poem|poetry|story|tale|fiction)\b/,
    /\b(code|program|javascript|python|html|css)\b/,
    /\b(movie|film|song|music|lyrics|actor|actress)\b/,
    /\b(game|play|sport|football|cricket|basketball)\b/,
    /\b(travel|vacation|flight|hotel|tourism)\b/,
    /\b(diet|exercise|workout|fitness|yoga)\b/,
    /\b(astrology|horoscope|zodiac)\b/,
];

function classifyAgent(responseText: string, actionType: string | null): string {
    const lower = (responseText || '').toLowerCase();
    if (lower.includes('transfer') || lower.includes('transaction') || actionType === 'transfer_success' || actionType === 'transactions') return 'Transaction';
    if (lower.includes('card') || lower.includes('credit limit') || actionType === 'card_issued' || actionType === 'pick_card') return 'Card';
    if (lower.includes('loan') || lower.includes('emi') || lower.includes('tenure') || actionType === 'loan_result') return 'Loan';
    return 'Manager';
}

function inferActionType(aiResponse: string): string | null {
    const lower = aiResponse.toLowerCase();
    if ((lower.includes('standard') && lower.includes('gold') && lower.includes('platinum')) || lower.includes('which card')) return 'pick_card';
    if (lower.includes('transfer') && (lower.includes('account number') || lower.includes('how much'))) return 'transfer_prompt';
    if (lower.includes('loan') && (lower.includes('how much') || lower.includes('amount'))) return 'loan_prompt';
    return null;
}

/**
 * Handle POST request to /api/ai/chat.
 */
export async function handleChatRequest(req: NextRequest): Promise<NextResponse> {
    try {
        const { user, account } = await withAuth(req);
        await connectToDatabase();

        const { messages, imageData, imageMimeType } = await req.json();

        // Non-banking guard
        const lastUserMsg = messages[messages.length - 1]?.parts?.[0]?.text?.toLowerCase() || '';
        const isNonBanking = NON_BANKING_PATTERNS.some((p) => p.test(lastUserMsg));
        if (isNonBanking) {
            const theme = getServerThemeConfig();
            return NextResponse.json({
                response: `I'm your ${theme.fullName} assistant and can only help with banking services. For our products and services, please visit our website.`,
                agent: 'Manager', actionType: null, actionData: null,
                suggestedActions: getSuggestedActions(null),
            });
        }

        // Image attachment
        const processedMessages = [...messages];
        if (imageData && imageMimeType) {
            const lastMsg = processedMessages[processedMessages.length - 1];
            if (lastMsg) lastMsg.parts = [...lastMsg.parts, { inlineData: { data: imageData, mimeType: imageMimeType } }];
        }

        // Gemini call
        const aiResponse = await chatWithGemini(processedMessages, {
            userId: user._id.toString(),
            accountNumber: account.accountNumber,
            userName: user.name,
        });

        // Action parsing + execution
        let action = extractActionJson(aiResponse);
        let conversationalText = cleanAiResponse(aiResponse);
        let actionType: string | null = null;
        let actionData: Record<string, unknown> | null = null;
        let finalResponse: string;

        // Fallback auto-detect
        if (!action) {
            if (lastUserMsg.includes('balance')) action = { action: 'GET_BALANCE' };
            else if (lastUserMsg.includes('transaction') || lastUserMsg.includes('history')) action = { action: 'GET_TRANSACTIONS', params: { limit: 5 } };
            else if (lastUserMsg.includes('credit score')) action = { action: 'GET_CREDIT_SCORE' };
        }

        if (action) {
            const result = await executeAction(action, user._id.toString(), account.accountNumber);
            actionType = result.type;
            actionData = (result.data as Record<string, unknown>) || null;
            const isHallucinated = conversationalText.length > 200 && (conversationalText.includes('Date:') || conversationalText.includes('Amount:'));
            const cleanConvo = isHallucinated ? '' : conversationalText;
            finalResponse = cleanConvo ? `${cleanConvo}\n\n${result.text}` : result.text;
        } else {
            finalResponse = conversationalText;
            actionType = inferActionType(aiResponse);
        }

        return NextResponse.json({
            response: finalResponse || "I'm here to help! Ask me about your balance, transactions, or apply for cards and loans.",
            agent: classifyAgent(finalResponse, actionType),
            actionType, actionData,
            suggestedActions: getSuggestedActions(actionType, finalResponse),
        });
    } catch (error: unknown) {
        if (error instanceof AuthError) return error.response;
        const err = error as Error;
        log.error('Chat request failed', { error: err.message, stack: err.stack });
        let msg = 'Something went wrong. Please try again.';
        if (err.message?.includes('429') || err.message?.includes('Resource exhausted')) msg = 'The AI service is temporarily busy.';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
