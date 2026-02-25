/**
 * @module api/loans
 * @description GET/POST /api/loans — Loan listing and application.
 */

import { NextRequest } from 'next/server';
import { getLoans, applyLoan } from './controller';

export async function GET() {
  return getLoans();
}

export async function POST(req: NextRequest) {
  return applyLoan(req);
}
