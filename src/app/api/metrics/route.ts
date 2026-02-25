/**
 * @module api/metrics
 * @description GET /api/metrics — Prometheus metrics scrape endpoint.
 *
 * Returns all registered metrics in Prometheus exposition format.
 * Configure Prometheus or Grafana Agent to scrape this endpoint.
 */

import { NextResponse } from 'next/server';
import { register } from '@/lib/metrics';

export async function GET() {
    try {
        const metrics = await register.metrics();
        return new NextResponse(metrics, {
            status: 200,
            headers: { 'Content-Type': register.contentType },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to collect metrics' }, { status: 500 });
    }
}
