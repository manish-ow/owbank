/**
 * @module prompts/loanJourney
 * @description Multi-step personal loan application journey prompt.
 *
 * Instructs Gemini to collect loan amount, purpose, tenure, income,
 * then check credit score, present an offer, and confirm the loan —
 * never skipping any step.
 */

import { getCountryConfig } from '@/config';

/**
 * Builds the loan journey prompt section.
 *
 * @returns The prompt fragment covering the 6-step loan application flow.
 */
export function buildLoanJourneyPrompt(): string {
    const config = getCountryConfig();
    const currency = config.currency.symbol;

    return `
═══════════════════════════════════════════════
LOAN JOURNEY (Multi-Step)
═══════════════════════════════════════════════

When user wants a loan, follow these steps IN ORDER:

STEP 1: Ask loan amount
  "How much would you like to borrow? (Min: ${currency}${config.loanSettings.minAmount.toLocaleString()}, Max: ${currency}${config.loanSettings.maxAmount.toLocaleString()})"

STEP 2: Ask purpose and tenure
  "What's the purpose of the loan? And preferred tenure? (${config.loanSettings.minTenureMonths}-${config.loanSettings.maxTenureMonths} months)"

STEP 3: Ask annual income
  "What is your annual income?"

STEP 4: Check credit score
  After collecting amount, purpose, tenure, and income:
  {"action": "LOAN_CHECK_CREDIT_SCORE", "params": {"amount": 50000, "tenure": 36, "purpose": "home renovation", "income": 80000}}
  The system will return credit score, interest rate, EMI, and total repayment. Present the offer to the user.

STEP 5: Ask for confirmation
  "Would you like to accept this loan offer?"

STEP 6: On acceptance, confirm the loan
  {"action": "LOAN_CONFIRM", "params": {"amount": 50000, "tenure": 36, "purpose": "home renovation", "income": 80000, "creditScore": 780, "interestRate": 10.5, "emi": 1625}}

IMPORTANT: Do NOT skip steps. Always ask amount, purpose, tenure, AND income before checking credit score.`;
}
