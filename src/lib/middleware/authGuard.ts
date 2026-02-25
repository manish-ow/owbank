/**
 * @module lib/middleware/authGuard
 * @description Reusable authentication prehandler for Next.js API routes.
 *
 * Eliminates the repeated session-check + user/account lookup boilerplate
 * that previously appeared in every protected route handler.
 *
 * @example
 * ```ts
 * export async function GET(req: NextRequest) {
 *   const { user, account } = await withAuth(req);
 *   // user and account are guaranteed to exist here
 * }
 * ```
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Account from '@/models/Account';
import type { IUser } from '@/models/User';
import type { IAccount } from '@/models/Account';
import logger from '@/lib/logger';

const log = logger.child({ module: 'authGuard' });

/** The authenticated context returned by {@link withAuth}. */
export interface AuthContext {
    /** The authenticated user document. */
    user: IUser;
    /** The user's primary bank account (present when `requireAccount` is true). */
    account: IAccount;
}

/** Lightweight context returned when `requireAccount` is false. */
export interface AuthContextNoAccount {
    user: IUser;
    account: IAccount | null;
}

/**
 * Custom error class thrown by {@link withAuth} for HTTP error responses.
 * Route handlers can catch this and return `error.response` directly.
 */
export class AuthError extends Error {
    /** Pre-built NextResponse ready to be returned from the route handler. */
    response: NextResponse;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'AuthError';
        this.response = NextResponse.json({ error: message }, { status });
    }
}

/**
 * Authenticate the current request and resolve the user + account.
 *
 * @param _req          - The incoming request (unused currently but kept for future middleware patterns).
 * @param requireAccount - When `true` (default), throws 404 if the user has no bank account.
 * @returns The authenticated user and (optionally) their account.
 * @throws {AuthError} 401 if no valid session, 404 if user/account not found.
 */
export async function withAuth(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _req?: unknown,
    requireAccount: boolean = true,
): Promise<AuthContext> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        log.warn('Unauthorized request — no valid session');
        throw new AuthError('Unauthorized', 401);
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        log.warn('User not found for email', { email: session.user.email });
        throw new AuthError('User not found', 404);
    }

    let account: IAccount | null = null;
    if (requireAccount) {
        account = await Account.findOne({ userId: user._id });
        if (!account) {
            log.warn('No account found for user', { userId: user._id.toString() });
            throw new AuthError('No account found', 404);
        }
    }

    return { user, account: account as IAccount };
}

export default withAuth;
