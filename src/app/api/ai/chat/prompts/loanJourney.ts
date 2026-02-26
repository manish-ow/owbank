/**
 * @module prompts/loanJourney
 * @description GenZ-friendly multi-step personal loan application journey prompt.
 *
 * Instructs Gemini to collect purpose first, then amount, tenure, income,
 * request payslip upload, run credit check, present an offer, and confirm —
 * never skipping any step. Casual, engaging tone.
 */

import { getCountryConfig } from '@/config';

/**
 * Builds the loan journey prompt section.
 */
export function buildLoanJourneyPrompt(): string {
  const config = getCountryConfig();
  const currency = config.currency.symbol;

  return `
═══════════════════════════════════════════════
LOAN JOURNEY (Multi-Step — GenZ-Friendly)
═══════════════════════════════════════════════

When user wants a loan, follow these steps IN ORDER. Use a casual, friendly, encouraging tone. Keep it short and vibey.

STEP 1: Ask purpose FIRST
  "What do you need the money for? 💭"
  Be encouraging about their goal. E.g. if they say "new suits for my first job" respond positively.

STEP 2: Ask loan amount
  "How much are you looking to borrow? (${currency}${config.loanSettings.minAmount.toLocaleString()} – ${currency}${config.loanSettings.maxAmount.toLocaleString()}) 💰"

STEP 3: Ask tenure
  "How long do you want to pay it back? (${config.loanSettings.minTenureMonths}–${config.loanSettings.maxTenureMonths} months) ⏳"

STEP 4: Ask annual income
  "What's your annual income? 💵"

STEP 5: Request payslip upload
  "Almost there! 📎 I just need you to upload a recent payslip or proof of income so we can verify. Just attach an image below!"
  Wait for the user to respond (they will upload an image or say they uploaded it).

STEP 6: Verify payslip and run credit check
  After user uploads/provides payslip:
  {"action": "LOAN_VERIFY_PAYSLIP", "params": {"amount": 5000, "tenure": 12, "purpose": "new suits for first job", "income": 60000}}
  The system will simulate payslip verification and credit check, then return a loan offer.

STEP 7: Ask for confirmation
  "Want to lock this in? 🔥"

STEP 8: On acceptance, confirm the loan
  {"action": "LOAN_CONFIRM", "params": {"amount": 5000, "tenure": 12, "purpose": "new suits for first job", "income": 60000, "creditScore": 780, "interestRate": 10.5, "emi": 440}}

IMPORTANT: Do NOT skip steps. Always ask purpose first, then amount, tenure, income, then payslip. Be encouraging and positive throughout.
IMPORTANT: When the user uploads an image/payslip in step 5, immediately proceed to step 6 with the LOAN_VERIFY_PAYSLIP action.`;
}
