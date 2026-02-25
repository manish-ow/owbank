/**
 * @module api/ai/chat/prompts/index
 * @description Prompt composer — assembles banking prompt modules into
 * the complete system prompt for the chat assistant.
 */

import { buildBankingCorePrompt, buildOtherActionsPrompt } from './banking';
import { buildCardJourneyPrompt } from './cardJourney';
import { buildLoanJourneyPrompt } from './loanJourney';

/**
 * Compose the full banking assistant system prompt from individual modules.
 */
export function buildBankingSystemPrompt(): string {
    return [
        buildBankingCorePrompt(),
        buildCardJourneyPrompt(),
        buildLoanJourneyPrompt(),
        buildOtherActionsPrompt(),
    ].join('\n');
}
