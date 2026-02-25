/**
 * @module api/ai/onboard/service
 * @description AI service for the onboarding domain.
 *
 * Owns the Gemini SDK call + onboarding prompt for new account opening.
 * Self-contained — can be extracted as a standalone microservice.
 */

import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { getServerThemeConfig } from '@/theme/themes';
import { buildOnboardingPrompt } from './prompts/onboarding';
import logger from '@/lib/logger';

const log = logger.child({ module: 'onboardService' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL_ID = 'gemini-2.0-flash';

/**
 * Send an onboarding chat message to Gemini and return the model response.
 */
export async function chatWithGeminiOnboarding(
    messages: { role: 'user' | 'model'; parts: Part[] }[],
): Promise<string> {
    const theme = getServerThemeConfig();
    const systemPrompt = buildOnboardingPrompt();

    const recentMessages = messages.slice(-9, -1);

    const history: Content[] = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        {
            role: 'model',
            parts: [{ text: `Understood. I'm the ${theme.assistantName} onboarding assistant. I'll guide new customers through account opening step-by-step, supporting ID card uploads and country-specific requirements. I will not skip any steps.` }],
        },
        ...recentMessages,
    ];

    const chat = ai.chats.create({ model: MODEL_ID, history });
    const lastMessage = messages[messages.length - 1];

    log.debug('Sending onboarding chat message');
    const result = await chat.sendMessage({ message: lastMessage.parts });
    return result.text ?? '';
}
