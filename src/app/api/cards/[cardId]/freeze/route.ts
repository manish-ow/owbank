/**
 * @module api/cards/[cardId]/freeze
 * @description POST /api/cards/:cardId/freeze — Toggle card freeze.
 */

import { NextRequest } from 'next/server';
import { toggleFreeze } from '../../controller';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params;
  return toggleFreeze(cardId);
}
