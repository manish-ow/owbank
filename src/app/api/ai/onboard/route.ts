import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import { chatWithGeminiOnboarding } from '@/lib/gemini';
import { generateReference } from '@/lib/helpers';
import { getCountryConfig } from '@/config';
import { getServerThemeConfig } from '@/theme/themes';
import type { Part } from '@google/genai';

/**
 * POST /api/ai/onboard
 * Unauthenticated AI endpoint for pre-login account onboarding.
 * Supports ID card image upload (Gemini OCR) and manual data entry.
 */

interface ActionResult {
    text: string;
    type: string;
    data?: any;
}

function findActionJsonBlock(text: string): { json: string; start: number; end: number } | null {
    const actionStart = text.search(/\{\s*"action"\s*:/);
    if (actionStart === -1) return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = actionStart; i < text.length; i++) {
        const ch = text[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') depth++;
        if (ch === '}') { depth--; if (depth === 0) return { json: text.slice(actionStart, i + 1), start: actionStart, end: i + 1 }; }
    }
    return null;
}

function cleanAiResponse(text: string): string {
    let cleaned = text;
    cleaned = cleaned.replace(/```(?:json)?\s*[\s\S]*?"action"[\s\S]*?```/g, '');
    const block = findActionJsonBlock(cleaned);
    if (block) {
        cleaned = cleaned.slice(0, block.start) + cleaned.slice(block.end);
    }
    cleaned = cleaned.replace(/```(?:json)?\s*```/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
}

function extractActionJson(text: string): any | null {
    const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?"action"[\s\S]*?)```/);
    if (codeFenceMatch) {
        const innerBlock = findActionJsonBlock(codeFenceMatch[1]);
        if (innerBlock) {
            try { return JSON.parse(innerBlock.json); } catch { }
        }
    }
    const block = findActionJsonBlock(text);
    if (block) {
        try { return JSON.parse(block.json); } catch { }
    }
    return null;
}

async function executeOnboardingAction(action: any): Promise<ActionResult> {
    await connectToDatabase();
    const theme = getServerThemeConfig();

    switch (action.action) {
        case 'ONBOARD_EXTRACT_ID': {
            // The AI itself extracts data from the image — we just acknowledge it
            return {
                text: 'I\'ve analyzed your ID card. Please confirm the details I extracted above are correct.',
                type: 'id_extracted',
            };
        }

        case 'ONBOARD_CREATE_ACCOUNT': {
            const { country, fullName, idNumber, dateOfBirth, phone, email, accountType } = action.params || {};

            if (!fullName || !email) {
                return { text: 'Missing required information. Please provide your full name and email.', type: 'error' };
            }

            const countryConfig = getCountryConfig(country || undefined);
            const welcomeBonus = countryConfig.welcomeBonus;
            const currencySymbol = countryConfig.currency.symbol;

            // Check if user already exists
            let user = await User.findOne({ email });
            if (user && user.hasAccount) {
                return {
                    text: `An account already exists for **${email}**. Please sign in instead.`,
                    type: 'error',
                };
            }

            // Create user if doesn't exist
            if (!user) {
                user = await User.create({
                    email,
                    name: fullName,
                    googleId: `onboard_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                    hasAccount: false,
                });
            }

            // Generate account number
            const count = await Account.countDocuments();
            const prefix = theme.accountPrefix || 'OW';
            const accountNumber = `${prefix}${String(count + 10001).padStart(5, '0')}`;

            // Create account
            await Account.create({
                userId: user._id,
                accountNumber,
                accountType: accountType || 'savings',
                balance: welcomeBonus,
                currency: countryConfig.currency.code,
                fullName,
                dateOfBirth: dateOfBirth || '',
                phone: phone || '',
                address: '',
                kycVerified: false,
            });

            // Record welcome bonus
            await Transaction.create({
                reference: generateReference(),
                fromAccount: 'SYSTEM',
                toAccount: accountNumber,
                amount: welcomeBonus,
                type: 'bonus',
                status: 'completed',
                description: 'Welcome bonus - New account opening',
            });

            // Mark user as having account
            user.hasAccount = true;
            user.name = fullName;
            await user.save();

            return {
                text: `Account created successfully! 🎉\n\n- **Account Number:** ${accountNumber}\n- **Type:** ${(accountType || 'savings').charAt(0).toUpperCase() + (accountType || 'savings').slice(1)}\n- **Welcome Bonus:** ${currencySymbol}${welcomeBonus.toLocaleString()}\n- **Country:** ${countryConfig.country}\n\nPlease sign in with your email **${email}** to access your account.`,
                type: 'account_created',
                data: { accountNumber, email, welcomeBonus, country: countryConfig.country },
            };
        }

        default:
            return { text: 'I could not process that. Let me help you open your account step by step.', type: 'error' };
    }
}

export async function POST(req: NextRequest) {
    try {
        const { messages, imageData, imageMimeType } = await req.json();

        // Process messages — add image data if present
        const processedMessages = messages.map((msg: any) => ({
            role: msg.role as 'user' | 'model',
            parts: msg.parts as Part[],
        }));

        if (imageData && imageMimeType) {
            const lastMsg = processedMessages[processedMessages.length - 1];
            if (lastMsg) {
                lastMsg.parts = [
                    ...lastMsg.parts,
                    { inlineData: { data: imageData, mimeType: imageMimeType } },
                ];
            }
        }

        const aiResponse = await chatWithGeminiOnboarding(processedMessages);

        // Extract and execute action
        const action = extractActionJson(aiResponse);
        const conversationalText = cleanAiResponse(aiResponse);
        let actionType: string | null = null;
        let actionData: any = null;
        let finalResponse: string;

        if (action) {
            const result = await executeOnboardingAction(action);
            actionType = result.type;
            actionData = result.data;
            const isHallucinated = conversationalText.length > 200 && (conversationalText.includes('Account Number:') && conversationalText.includes('Welcome Bonus:'));
            const cleanConvo = isHallucinated ? '' : conversationalText;
            finalResponse = cleanConvo
                ? `${cleanConvo}\n\n${result.text}`
                : result.text;
        } else {
            finalResponse = conversationalText;
        }

        // Suggested actions based on context
        let suggestedActions: any[] = [];
        const lower = (finalResponse || '').toLowerCase();
        if (lower.includes('upload') || lower.includes('photo') || lower.includes('manually')) {
            suggestedActions = [
                { label: '📷 Upload ID', icon: '📷', message: 'I want to upload my ID card' },
                { label: '✍️ Enter Manually', icon: '✍️', message: 'I will provide my details manually' },
            ];
        } else if (lower.includes('savings') && lower.includes('checking')) {
            suggestedActions = [
                { label: 'Savings', icon: '🏦', message: 'Savings account' },
                { label: 'Checking', icon: '💳', message: 'Checking account' },
            ];
        } else if (actionType === 'account_created') {
            suggestedActions = [
                { label: 'Sign In', icon: '🔐', message: 'Take me to sign in' },
            ];
        }

        return NextResponse.json({
            response: finalResponse || "Welcome! I'll help you open your bank account. You can upload your ID card or provide your details manually.",
            actionType,
            actionData,
            suggestedActions,
        });
    } catch (error: any) {
        console.error('Onboarding chat error:', error);
        let friendlyMessage = 'Something went wrong. Please try again.';
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
            friendlyMessage = 'The AI service is temporarily busy. Please wait a moment and try again.';
        }
        return NextResponse.json({ error: friendlyMessage }, { status: 500 });
    }
}
