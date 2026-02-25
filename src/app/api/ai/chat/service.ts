/**
 * @module api/ai/chat/service
 * @description AI service for the banking chat domain.
 *
 * Owns the Gemini SDK call + prompt assembly for banking conversations.
 * Self-contained — can be extracted as a standalone microservice.
 */

import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { getServerThemeConfig } from '@/theme/themes';
import { buildBankingSystemPrompt } from './prompts';
import logger from '@/lib/logger';

const log = logger.child({ module: 'chatService' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL_ID = 'gemini-2.0-flash';

/** User context passed to personalise banking chat responses. */
export interface AgentContext {
    userId: string;
    accountNumber: string;
    userName: string;
}

/**
 * Send a banking chat message to Gemini and return the model response.
 */
export async function chatWithGemini(
    messages: { role: 'user' | 'model'; parts: Part[] }[],
    context: AgentContext,
): Promise<string> {
    const theme = getServerThemeConfig();
    const systemPrompt = buildBankingSystemPrompt();

    const recentMessages = messages.slice(-7, -1);

    const history: Content[] = [
        {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser info: Name: ${context.userName}, Account: ${context.accountNumber}, UserId: ${context.userId}` }],
        },
        {
            role: 'model',
            parts: [{ text: `Understood. I'm the ${theme.assistantName}. I'll follow the multi-step card and loan journeys, always asking qualifying questions before proceeding. I will NEVER make up financial data. I can also analyze uploaded images.` }],
        },
        ...recentMessages,
    ];

    const chat = ai.chats.create({ model: MODEL_ID, history });
    const lastMessage = messages[messages.length - 1];

    log.debug('Sending banking chat message', { userId: context.userId });
    const result = await chat.sendMessage({ message: lastMessage.parts });
    return result.text ?? '';
}
