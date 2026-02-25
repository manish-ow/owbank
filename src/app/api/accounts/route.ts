/**
 * @module api/accounts
 * @description GET/PATCH /api/accounts — Account listing and currency update.
 */

import { NextRequest } from 'next/server';
import { getAccounts, updateCurrency } from './controller';

export async function GET() {
  return getAccounts();
}

export async function PATCH(req: NextRequest) {
  return updateCurrency(req);
}
