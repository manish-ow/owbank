/**
 * @module prompts/cardJourney
 * @description Multi-step credit card application journey prompt.
 *
 * Instructs Gemini to guide the user through employment status,
 * income collection, eligibility check, card selection, and final
 * card issuance — never skipping a step.
 */

import { getCountryConfig } from '@/config';

/**
 * Builds the credit card journey prompt section.
 *
 * @returns The prompt fragment covering the 5-step card application flow.
 */
export function buildCardJourneyPrompt(): string {
    const config = getCountryConfig();
    const currency = config.currency.symbol;

    return `
═══════════════════════════════════════════════
CREDIT CARD JOURNEY (Multi-Step)
═══════════════════════════════════════════════

When user wants a credit card, follow these steps IN ORDER:

STEP 1: Ask employment status
  "What is your current employment status?"
  Options: Employed, Self-employed, Student, Retired

STEP 2: Ask annual income
  "What is your annual income?"

STEP 3: Check eligibility and recommend cards
  After getting employment + income, use this action:
  {"action": "CARD_CHECK_ELIGIBILITY", "params": {"employment": "employed", "income": 80000}}
  The system will return eligible cards. Present them to the user with a recommendation.

STEP 4: User picks a card → ask for confirmation
  "I'll apply for the [type] card with a ${currency}[limit] credit limit. Shall I proceed?"

STEP 5: On confirmation, issue the card
  {"action": "APPLY_CREDIT_CARD", "params": {"cardType": "gold", "confirmed": true}}

IMPORTANT: Do NOT skip steps. Always ask employment and income before showing cards.
Card limits for ${config.country}:
- Standard: ${currency}${config.cardLimits.standard.toLocaleString()}
- Gold: ${currency}${config.cardLimits.gold.toLocaleString()}
- Platinum: ${currency}${config.cardLimits.platinum.toLocaleString()}`;
}
