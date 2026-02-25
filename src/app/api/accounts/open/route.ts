/**
 * @module api/accounts/open
 * @description POST /api/accounts/open — New account creation.
 */

import { NextRequest } from 'next/server';
import { openAccount } from '../controller';

export async function POST(req: NextRequest) {
  return openAccount(req);
}
