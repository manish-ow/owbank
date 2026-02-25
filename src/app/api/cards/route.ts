/**
 * @module api/cards
 * @description GET/POST /api/cards — Card listing and application.
 */

import { NextRequest } from 'next/server';
import { getCards, applyCard } from './controller';

export async function GET() {
  return getCards();
}

export async function POST(req: NextRequest) {
  return applyCard(req);
}
