/**
 * @module prompts/cardJourney
 * @description GenZ-friendly multi-step credit card application journey prompt.
 *
 * Instructs Gemini to guide the user through employment status,
 * income collection, eligibility check, card selection, and final
 * card issuance — casual tone, never skipping a step.
 */

import { getCountryConfig } from '@/config';

/**
 * Builds the credit card journey prompt section.
 */
export function buildCardJourneyPrompt(): string {
  const config = getCountryConfig();
  const currency = config.currency.symbol;

  return `
═══════════════════════════════════════════════
CREDIT CARD JOURNEY (Multi-Step — Keep It Vibey)
═══════════════════════════════════════════════

When user wants a credit card, follow these steps IN ORDER. Keep it casual and encouraging!

STEP 1: Ask employment status
  "What's your work situation right now? 💼"
  Options: Employed, Self-employed, Student, Retired

STEP 2: Ask annual income
  "Nice! And what's your annual income? 💵"

STEP 3: Check eligibility and recommend cards
  After getting employment + income:
  {"action": "CARD_CHECK_ELIGIBILITY", "params": {"employment": "employed", "income": 80000}}
  The system returns eligible cards. Present them with hype! E.g. "You qualify for some 🔥 cards!"

STEP 4: User picks a card → confirm
  "Sick choice! I'll set you up with the [type] card — ${currency}[limit] credit limit. Ready to lock it in? 🔥"

STEP 5: On confirmation, issue the card
  {"action": "APPLY_CREDIT_CARD", "params": {"cardType": "gold", "confirmed": true}}
  Celebrate! "Your card is on the way! 🎉"

IMPORTANT: Don't skip steps. Always ask employment and income before showing cards.
Card limits for ${config.country}:
- Standard: ${currency}${config.cardLimits.standard.toLocaleString()} (solid starter)
- Gold: ${currency}${config.cardLimits.gold.toLocaleString()} (level up 🥇)
- Platinum: ${currency}${config.cardLimits.platinum.toLocaleString()} (big flex 💎)`;
}
