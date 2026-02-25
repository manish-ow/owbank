/**
 * @module api/ai/onboard
 * @description POST /api/ai/onboard — Unauthenticated AI onboarding endpoint.
 */

import { NextRequest } from 'next/server';
import { handleOnboardRequest } from './controller';

export async function POST(req: NextRequest) {
    return handleOnboardRequest(req);
}
