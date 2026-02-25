/**
 * @module controllers/types
 * @description Shared type definitions used across all controllers.
 */

import type { IUser } from '@/models/User';
import type { IAccount } from '@/models/Account';

/**
 * Represents the authenticated context available to every controller method.
 * Populated by the auth prehandler before controller code runs.
 */
export interface AuthenticatedContext {
    /** The authenticated MongoDB user document. */
    user: IUser;
    /** The user's primary bank account. */
    account: IAccount;
}

/**
 * Standard result returned by an AI action handler (e.g. GET_BALANCE, TRANSFER).
 */
export interface ActionResult {
    /** Human-readable response text (may include Markdown). */
    text: string;
    /** Machine-readable action type identifier (e.g. 'balance', 'transfer_success'). */
    type: string;
    /** Optional structured data payload returned to the frontend. */
    data?: Record<string, unknown>;
}

/**
 * Standardised controller response shape returned to route handlers.
 */
export interface ControllerResponse<T = unknown> {
    /** HTTP status code. */
    status: number;
    /** Response body payload. */
    body: T;
}
