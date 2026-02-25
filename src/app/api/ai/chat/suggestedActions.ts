/**
 * @module api/ai/chat/suggestedActions
 * @description Smart next-best-action prediction for the chat UI.
 *
 * Two-tier prediction:
 * 1. **Response-text analysis** — parses the AI's actual response to detect
 *    questions/options and generates matching buttons (highest priority).
 * 2. **Action-type fallback** — if no text-based prediction fires, uses the
 *    last executed action type for contextual follow-ups.
 */

import { getCountryConfig } from '@/config';

/** Shape of a single suggested action chip shown in the chat UI. */
export interface SuggestedAction {
    label: string;
    icon: string;
    message: string;
}

/* ─────────────────────────────────────────────
 * Tier 1 — Response-text pattern matching
 * ───────────────────────────────────────────── */

interface ResponsePattern {
    /** Test function — receives the lowercase AI response. */
    test: (lower: string) => boolean;
    /** Generate the action chips when the pattern matches. */
    actions: (lower: string) => SuggestedAction[];
}

const RESPONSE_PATTERNS: ResponsePattern[] = [
    // ─── Card Journey ───────────────────────────

    // Employment status question
    {
        test: (l) =>
            (l.includes('employment') || l.includes('employed')) &&
            (l.includes('self-employed') || l.includes('self employed')) &&
            (l.includes('student') || l.includes('retired')),
        actions: () => [
            { label: '💼 Employed', icon: '💼', message: 'I am employed' },
            { label: '🏢 Self-employed', icon: '🏢', message: 'I am self-employed' },
            { label: '🎓 Student', icon: '🎓', message: 'I am a student' },
            { label: '🏖️ Retired', icon: '🏖️', message: 'I am retired' },
        ],
    },

    // Annual income question
    {
        test: (l) =>
            (l.includes('annual income') || l.includes('yearly income') || l.includes('annual salary') || l.includes('yearly salary')) &&
            (l.includes('?') || l.includes('how much')),
        actions: () => {
            const sym = getCountryConfig().currency.symbol;
            return [
                { label: `${sym}30k`, icon: '💵', message: `My annual income is ${sym}30,000` },
                { label: `${sym}60k`, icon: '💵', message: `My annual income is ${sym}60,000` },
                { label: `${sym}100k`, icon: '💵', message: `My annual income is ${sym}100,000` },
                { label: `${sym}150k+`, icon: '💵', message: `My annual income is ${sym}150,000` },
            ];
        },
    },

    // Card type selection — "which card" or all three types mentioned
    {
        test: (l) =>
            (l.includes('which card') || l.includes('apply for')) &&
            (l.includes('card') || l.includes('credit')) ||
            (l.includes('standard') && l.includes('gold') && l.includes('platinum')),
        actions: () => [
            { label: '💳 Standard', icon: '💳', message: 'I want the Standard card' },
            { label: '🥇 Gold', icon: '🥇', message: 'I want the Gold card' },
            { label: '💎 Platinum', icon: '💎', message: 'I want the Platinum card' },
        ],
    },

    // Cyber insurance question
    {
        test: (l) =>
            l.includes('cyber insurance') && (l.includes('?') || l.includes('would you like') || l.includes('want')),
        actions: () => [
            { label: '✅ Yes, add it', icon: '🛡️', message: 'Yes, I want cyber insurance' },
            { label: '❌ No thanks', icon: '❌', message: 'No, I don\'t need cyber insurance' },
        ],
    },

    // ─── Loan Journey ──────────────────────────

    // Loan purpose question
    {
        test: (l) =>
            l.includes('purpose') && (l.includes('loan') || l.includes('borrow')) &&
            (l.includes('?') || l.includes('what') || l.includes('reason')),
        actions: () => [
            { label: '🏠 Home', icon: '🏠', message: 'Home renovation' },
            { label: '📚 Education', icon: '📚', message: 'Education expenses' },
            { label: '🚗 Vehicle', icon: '🚗', message: 'Vehicle purchase' },
            { label: '💊 Medical', icon: '💊', message: 'Medical expenses' },
            { label: '💼 Business', icon: '💼', message: 'Business investment' },
            { label: '👤 Personal', icon: '👤', message: 'Personal use' },
        ],
    },

    // Loan amount question
    {
        test: (l) =>
            (l.includes('how much') || l.includes('loan amount') || l.includes('how much would you like to borrow')) &&
            (l.includes('loan') || l.includes('borrow')),
        actions: () => {
            const sym = getCountryConfig().currency.symbol;
            return [
                { label: `${sym}5,000`, icon: '🏦', message: `I want to borrow ${sym}5,000` },
                { label: `${sym}10,000`, icon: '🏦', message: `I want to borrow ${sym}10,000` },
                { label: `${sym}25,000`, icon: '🏦', message: `I want to borrow ${sym}25,000` },
                { label: `${sym}50,000`, icon: '🏦', message: `I want to borrow ${sym}50,000` },
            ];
        },
    },

    // Loan tenure question
    {
        test: (l) =>
            (l.includes('tenure') || l.includes('repayment period') || l.includes('how long') || l.includes('duration')) &&
            (l.includes('loan') || l.includes('month') || l.includes('repay')),
        actions: () => [
            { label: '6 months', icon: '📅', message: '6 months' },
            { label: '12 months', icon: '📅', message: '12 months' },
            { label: '24 months', icon: '📅', message: '24 months' },
            { label: '36 months', icon: '📅', message: '36 months' },
        ],
    },

    // ─── Transfer Journey ──────────────────────

    // Transfer amount question (only when AI is asking)
    {
        test: (l) =>
            (l.includes('how much') || (l.includes('amount') && l.includes('?'))) &&
            (l.includes('transfer') || l.includes('send')) &&
            !l.includes('loan') && !l.includes('borrow') &&
            !l.includes('submitted') && !l.includes('completed') && !l.includes('success'),
        actions: () => {
            const sym = getCountryConfig().currency.symbol;
            return [
                { label: `${sym}50`, icon: '💸', message: `Transfer ${sym}50` },
                { label: `${sym}100`, icon: '💸', message: `Transfer ${sym}100` },
                { label: `${sym}250`, icon: '💸', message: `Transfer ${sym}250` },
                { label: `${sym}500`, icon: '💸', message: `Transfer ${sym}500` },
            ];
        },
    },

    // ─── General Confirmations ─────────────────

    // Accept / Decline loan offer
    {
        test: (l) =>
            ((l.includes('accept') && l.includes('offer')) ||
                (l.includes('would you like to') && (l.includes('accept') || l.includes('proceed'))) ||
                (l.includes('confirm') && l.includes('loan'))) &&
            l.includes('?'),
        actions: () => [
            { label: '✅ Accept', icon: '✅', message: 'Yes, I accept the loan offer' },
            { label: '❌ Decline', icon: '❌', message: 'No, I want to decline' },
        ],
    },

    // Generic yes/no confirmation (card, freeze, etc.)
    {
        test: (l) =>
            (l.includes('confirm') || l.includes('would you like to proceed') ||
                l.includes('shall i proceed') || l.includes('do you want to proceed') ||
                l.includes('are you sure')) &&
            l.includes('?'),
        actions: () => [
            { label: '✅ Yes, proceed', icon: '✅', message: 'Yes, please proceed' },
            { label: '❌ No, cancel', icon: '❌', message: 'No, cancel' },
        ],
    },

    // Freeze or unfreeze question
    {
        test: (l) =>
            (l.includes('freeze') || l.includes('unfreeze') || l.includes('block')) &&
            l.includes('card') && l.includes('?'),
        actions: () => [
            { label: '🥶 Freeze Card', icon: '🥶', message: 'Yes, freeze my card' },
            { label: '☀️ Unfreeze Card', icon: '☀️', message: 'Unfreeze my card' },
            { label: '❌ Cancel', icon: '❌', message: 'Never mind' },
        ],
    },

    // ─── Account type selection during any flow ─

    {
        test: (l) =>
            l.includes('savings') && l.includes('checking') &&
            (l.includes('which') || l.includes('prefer') || l.includes('type of account')),
        actions: () => [
            { label: '🏦 Savings', icon: '🏦', message: 'Savings account' },
            { label: '💳 Checking', icon: '💳', message: 'Checking account' },
        ],
    },

    // ─── What can I help with (general greeting) ─
    {
        test: (l) =>
            (l.includes('how can i help') || l.includes('what can i') || l.includes('what would you like') || l.includes('i can help you with')) &&
            !l.includes('transfer') && !l.includes('card') && !l.includes('loan'),
        actions: () => [
            { label: '💰 Balance', icon: '💰', message: 'Show my account balance' },
            { label: '📋 Transactions', icon: '📋', message: 'Show my recent transactions' },
            { label: '↗️ Transfer', icon: '↗️', message: 'I want to transfer money' },
            { label: '💳 Credit Card', icon: '💳', message: 'I want to apply for a credit card' },
            { label: '🏦 Loan', icon: '🏦', message: 'I want to apply for a loan' },
        ],
    },
];

/* ─────────────────────────────────────────────
 * Tier 2 — Action-type-based fallback
 * ───────────────────────────────────────────── */

function getActionTypeActions(actionType: string | null): SuggestedAction[] {
    const sym = getCountryConfig().currency.symbol;

    switch (actionType) {
        case 'balance':
            return [
                { label: 'Transactions', icon: '📋', message: 'Show my last 5 transactions' },
                { label: 'Transfer Money', icon: '↗️', message: 'I want to transfer money' },
                { label: 'Apply for Card', icon: '💳', message: 'I want to apply for a credit card' },
            ];
        case 'transactions':
            return [
                { label: 'Check Balance', icon: '💰', message: 'Show my account balance' },
                { label: 'Transfer Money', icon: '↗️', message: 'I want to transfer money' },
                { label: 'More Transactions', icon: '📋', message: 'Show my last 10 transactions' },
            ];
        // ─── Completed workflows reset to home actions ───
        case 'transfer_success':
        case 'card_issued':
        case 'loan_result':
            return [
                { label: '💰 Balance', icon: '💰', message: 'Show my account balance' },
                { label: '📋 Transactions', icon: '📋', message: 'Show my last 5 transactions' },
                { label: '💳 Credit Card', icon: '💳', message: 'I want to apply for a credit card' },
                { label: '🏦 Loan', icon: '🏦', message: 'I want to apply for a loan' },
                { label: '↗️ Transfer', icon: '↗️', message: 'I want to transfer money' },
            ];
        // ─── Mid-journey steps (keep contextual) ───
        case 'card_eligibility':
            return [
                { label: '💳 Standard', icon: '💳', message: 'I want the standard card' },
                { label: '🥇 Gold', icon: '🥇', message: 'I want the gold card' },
                { label: '💎 Platinum', icon: '💎', message: 'I want the platinum card' },
            ];
        case 'card_confirm':
            return [
                { label: '✅ Yes, proceed', icon: '✅', message: 'Yes, please proceed with the application' },
                { label: '❌ No, cancel', icon: '❌', message: 'No, I changed my mind' },
            ];
        case 'loan_offer':
            return [
                { label: '✅ Accept Offer', icon: '✅', message: 'Yes, I accept the loan offer' },
                { label: '❌ No Thanks', icon: '❌', message: 'No, I want to reconsider' },
            ];
        case 'credit_score':
            return [
                { label: 'Apply for Loan', icon: '🏦', message: 'I want to apply for a loan' },
                { label: 'Apply for Card', icon: '💳', message: 'I want to apply for a credit card' },
                { label: 'Check Balance', icon: '💰', message: 'Show my account balance' },
            ];
        case 'pick_card':
            return [
                { label: '💳 Standard', icon: '💳', message: 'I want a standard credit card' },
                { label: '🥇 Gold', icon: '🥇', message: 'I want a gold credit card' },
                { label: '💎 Platinum', icon: '💎', message: 'I want a platinum credit card' },
            ];
        case 'transfer_prompt':
            return [
                { label: 'Check Balance', icon: '💰', message: 'Show my account balance' },
                { label: '❌ Cancel', icon: '❌', message: 'Never mind, cancel the transfer' },
            ];
        case 'loan_prompt':
            return [
                { label: `${sym}5,000 Loan`, icon: '🏦', message: `I want a ${sym}5,000 loan for 12 months` },
                { label: `${sym}10,000 Loan`, icon: '🏦', message: `I want a ${sym}10,000 loan for 24 months` },
                { label: `${sym}25,000 Loan`, icon: '🏦', message: `I want a ${sym}25,000 loan for 36 months` },
            ];
        default:
            return [
                { label: '💰 Balance', icon: '💰', message: 'Show my account balance' },
                { label: '📋 Transactions', icon: '📋', message: 'Show my last 5 transactions' },
                { label: '💳 Credit Card', icon: '💳', message: 'I want to apply for a credit card' },
                { label: '🏦 Loan', icon: '🏦', message: 'I want to apply for a loan' },
                { label: '↗️ Transfer', icon: '↗️', message: 'I want to transfer money' },
            ];
    }
}

/* ─────────────────────────────────────────────
 * Public API
 * ───────────────────────────────────────────── */

/**
 * Get smart next-best-action chips.
 *
 * @param actionType  The action type from the last executed action (may be null).
 * @param responseText The full AI response text — used for Tier 1 text-based prediction.
 */
export function getSuggestedActions(
    actionType: string | null,
    responseText?: string,
): SuggestedAction[] {
    // Tier 1: Parse the AI's actual response for contextual cues
    if (responseText) {
        const lower = responseText.toLowerCase();
        for (const pattern of RESPONSE_PATTERNS) {
            if (pattern.test(lower)) {
                return pattern.actions(lower);
            }
        }
    }

    // Tier 2: Fall back to action-type-based suggestions
    return getActionTypeActions(actionType);
}
