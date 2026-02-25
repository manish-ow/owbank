/**
 * @module api/ai/chat
 * @description POST /api/ai/chat — Banking AI chat endpoint.
 */

import { NextRequest } from 'next/server';
import { handleChatRequest } from './controller';

export async function POST(req: NextRequest) {
  return handleChatRequest(req);
}
