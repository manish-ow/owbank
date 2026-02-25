import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { startConsumer, isConsumerRunning } from '@/lib/kafka';
import { handleTransactionMessage } from '@/lib/transactionConsumer';

/**
 * GET /api/kafka/consumer
 * Bootstraps the Kafka consumer for the owbank-transfers topic.
 * Idempotent — calling multiple times is safe.
 *
 * NOTE: In Next.js serverless environments the process may be recycled
 * between requests. For production, move this to a standalone worker
 * process (e.g. scripts/consumer.ts) that runs continuously.
 */
export async function GET() {
    try {
        if (isConsumerRunning()) {
            return NextResponse.json({ status: 'already running' });
        }

        await connectToDatabase();
        const result = await startConsumer(handleTransactionMessage);

        return NextResponse.json({
            status: result.started ? 'consumer started' : 'already running',
        });
    } catch (error: any) {
        console.error('[/api/kafka/consumer] Failed to start consumer:', error);
        return NextResponse.json(
            { error: 'Failed to start consumer', detail: error.message },
            { status: 500 },
        );
    }
}
