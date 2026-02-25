/**
 * @module lib/ai/actionParser
 * @description Shared utilities for parsing and cleaning Gemini AI responses.
 *
 * Extracts structured action JSON blocks from free-text AI output and
 * strips action JSON from the conversational text. Used by both the
 * banking chat controller and the onboarding controller.
 */

/**
 * Locate the first `{"action": ...}` JSON block in a string by walking
 * brace depth. Handles nested objects and quoted strings correctly.
 *
 * @param text - The raw AI response text to search.
 * @returns The extracted JSON substring and its position, or `null` if none found.
 */
export function findActionJsonBlock(
    text: string,
): { json: string; start: number; end: number } | null {
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
        if (ch === '}') {
            depth--;
            if (depth === 0) {
                return { json: text.slice(actionStart, i + 1), start: actionStart, end: i + 1 };
            }
        }
    }
    return null;
}

/**
 * Remove action JSON blocks and code fences from the AI response,
 * leaving only the conversational text.
 *
 * @param text - Raw AI response text.
 * @returns Cleaned conversational text.
 */
export function cleanAiResponse(text: string): string {
    let cleaned = text;

    // Remove markdown code fences wrapping JSON action blocks
    cleaned = cleaned.replace(/```(?:json)?\s*[\s\S]*?"action"[\s\S]*?```/g, '');

    // Remove standalone action JSON blocks
    const block = findActionJsonBlock(cleaned);
    if (block) {
        cleaned = cleaned.slice(0, block.start) + cleaned.slice(block.end);
    }

    // Remove empty code fences
    cleaned = cleaned.replace(/```(?:json)?\s*```/g, '');

    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
}

/**
 * Extract the first action JSON object from the AI response.
 * Tries code-fence-wrapped JSON first, then standalone blocks.
 *
 * @param text - Raw AI response text.
 * @returns Parsed action object or `null` if no valid action found.
 */
export function extractActionJson(text: string): Record<string, unknown> | null {
    // Try code fence wrapped JSON first
    const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?"action"[\s\S]*?)```/);
    if (codeFenceMatch) {
        const innerBlock = findActionJsonBlock(codeFenceMatch[1]);
        if (innerBlock) {
            try { return JSON.parse(innerBlock.json); } catch { /* skip */ }
        }
    }

    // Try standalone JSON
    const block = findActionJsonBlock(text);
    if (block) {
        try { return JSON.parse(block.json); } catch { /* skip */ }
    }

    return null;
}
