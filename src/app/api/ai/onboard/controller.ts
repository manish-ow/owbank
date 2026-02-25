/**
 * @module api/ai/onboard/controller
 * @description Onboarding chat controller for new account opening.
 *
 * All dependencies co-located: service.ts, prompts/onboarding.ts
 * Uses shared actionParser from the chat domain for JSON extraction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import { chatWithGeminiOnboarding } from './service';
import { extractActionJson, cleanAiResponse } from '../chat/actionParser';
import { generateReference } from '@/lib/helpers';
import { getCountryConfig } from '@/config';
import { getServerThemeConfig } from '@/theme/themes';
import logger from '@/lib/logger';
import type { Part } from '@google/genai';
import type { ActionResult } from '@/lib/types';

const log = logger.child({ module: 'onboardController' });

/** Execute an onboarding-specific action. */
async function executeOnboardingAction(action: Record<string, unknown>): Promise<ActionResult> {
    await connectToDatabase();
    const theme = getServerThemeConfig();

    switch (action.action as string) {
        case 'ONBOARD_EXTRACT_ID':
            return { text: "I've analyzed your ID card. Please confirm the details I extracted above are correct.", type: 'id_extracted' };

        case 'ONBOARD_CREATE_ACCOUNT': {
            const params = (action.params as Record<string, unknown>) || {};
            const { country, fullName, idNumber, dateOfBirth, phone, email, accountType } = params as {
                country?: string; fullName?: string; idNumber?: string; dateOfBirth?: string; phone?: string; email?: string; accountType?: string;
            };

            if (!fullName || !email) return { text: 'Missing required information.', type: 'error' };

            const countryConfig = getCountryConfig(country || undefined);
            const welcomeBonus = countryConfig.welcomeBonus;
            const sym = countryConfig.currency.symbol;

            let user = await User.findOne({ email });
            if (user && user.hasAccount) return { text: `An account already exists for **${email}**. Please sign in instead.`, type: 'error' };

            if (!user) {
                user = await User.create({ email, name: fullName, googleId: `onboard_${Date.now()}_${Math.random().toString(36).slice(2)}`, hasAccount: false });
            }

            const count = await Account.countDocuments();
            const prefix = theme.accountPrefix || 'OW';
            const accountNumber = `${prefix}${String(count + 10001).padStart(5, '0')}`;

            await Account.create({ userId: user._id, accountNumber, accountType: accountType || 'savings', balance: welcomeBonus, currency: countryConfig.currency.code, fullName, dateOfBirth: dateOfBirth || '', phone: phone || '', address: '', kycVerified: false });
            await Transaction.create({ reference: generateReference(), fromAccount: 'SYSTEM', toAccount: accountNumber, amount: welcomeBonus, type: 'bonus', status: 'completed', description: 'Welcome bonus - New account opening' });

            user.hasAccount = true;
            user.name = fullName;
            await user.save();

            log.info('New account created via onboarding', { email, accountNumber });

            return {
                text: `Account created! 🎉\n\n- **Account Number:** ${accountNumber}\n- **Type:** ${(accountType || 'savings').charAt(0).toUpperCase() + (accountType || 'savings').slice(1)}\n- **Welcome Bonus:** ${sym}${welcomeBonus.toLocaleString()}\n\nPlease sign in with **${email}**.`,
                type: 'account_created',
                data: { accountNumber, email, welcomeBonus, country: countryConfig.country },
            };
        }

        default:
            return { text: "Let me help you open your account step by step.", type: 'error' };
    }
}

function getOnboardingSuggestedActions(responseText: string, actionType: string | null) {
    const lower = (responseText || '').toLowerCase();
    if (lower.includes('upload') || lower.includes('photo') || lower.includes('manually')) {
        return [
            { label: '📷 Upload ID', icon: '📷', message: 'I want to upload my ID card' },
            { label: '✍️ Enter Manually', icon: '✍️', message: 'I will provide my details manually' },
        ];
    }
    if (lower.includes('savings') && lower.includes('checking')) {
        return [
            { label: 'Savings', icon: '🏦', message: 'Savings account' },
            { label: 'Checking', icon: '💳', message: 'Checking account' },
        ];
    }
    if (actionType === 'account_created') return [{ label: 'Sign In', icon: '🔐', message: 'Take me to sign in' }];
    return [];
}

/** Handle POST request to /api/ai/onboard. */
export async function handleOnboardRequest(req: NextRequest): Promise<NextResponse> {
    try {
        const { messages, imageData, imageMimeType } = await req.json();

        const processedMessages = messages.map((msg: { role: string; parts: Part[] }) => ({
            role: msg.role as 'user' | 'model',
            parts: msg.parts as Part[],
        }));

        if (imageData && imageMimeType) {
            const lastMsg = processedMessages[processedMessages.length - 1];
            if (lastMsg) lastMsg.parts = [...lastMsg.parts, { inlineData: { data: imageData, mimeType: imageMimeType } }];
        }

        const aiResponse = await chatWithGeminiOnboarding(processedMessages);
        const action = extractActionJson(aiResponse);
        const conversationalText = cleanAiResponse(aiResponse);
        let actionType: string | null = null;
        let actionData: Record<string, unknown> | null = null;
        let finalResponse: string;

        if (action) {
            const result = await executeOnboardingAction(action);
            actionType = result.type;
            actionData = (result.data as Record<string, unknown>) || null;
            const isHallucinated = conversationalText.length > 200 && conversationalText.includes('Account Number:') && conversationalText.includes('Welcome Bonus:');
            const cleanConvo = isHallucinated ? '' : conversationalText;
            finalResponse = cleanConvo ? `${cleanConvo}\n\n${result.text}` : result.text;
        } else {
            finalResponse = conversationalText;
        }

        return NextResponse.json({
            response: finalResponse || "Welcome! I'll help you open your bank account.",
            actionType, actionData,
            suggestedActions: getOnboardingSuggestedActions(finalResponse, actionType),
        });
    } catch (error: unknown) {
        const err = error as Error;
        log.error('Onboarding chat failed', { error: err.message });
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
