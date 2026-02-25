/**
 * @module api/transactions
 * @description GET /api/transactions — Transaction history.
 */

import { NextRequest } from 'next/server';
import { getTransactions } from './controller';

export async function GET(req: NextRequest) {
  return getTransactions(req);
}
