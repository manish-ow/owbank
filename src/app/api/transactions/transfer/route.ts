/**
 * @module api/transactions/transfer
 * @description POST /api/transactions/transfer — Transfer endpoint.
 */

import { NextRequest } from 'next/server';
import { transfer } from '../controller';

export async function POST(req: NextRequest) {
  return transfer(req);
}
