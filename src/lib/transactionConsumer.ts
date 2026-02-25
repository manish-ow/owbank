import { EachMessagePayload } from 'kafkajs';
import { connectToDatabase } from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

export type TransactionEventType =
    | 'TRANSFER_INITIATED'
    | 'TRANSFER_COMPLETED'
    | 'TRANSFER_FAILED';

export interface TransactionEvent {
    type: TransactionEventType;
    fromAccount: string;
    toAccount: string;
    amount: number;
    reference: string;
    timestamp: string;
}

/**
 * Processes a single Kafka message from the owbank-transfers topic.
 * Called by the consumer runner for each message.
 */
export async function handleTransactionMessage({
    message,
    partition,
}: EachMessagePayload): Promise<void> {
    if (!message.value) return;

    let event: TransactionEvent;
    try {
        event = JSON.parse(message.value.toString()) as TransactionEvent;
    } catch {
        console.error('[TransactionConsumer] Failed to parse message value:', message.value.toString());
        return;
    }

    const offset = message.offset;
    console.log(
        `[TransactionConsumer] ${event.type} ref=${event.reference} amount=${event.amount} partition=${partition} offset=${offset}`,
    );

    await connectToDatabase();

    switch (event.type) {
        case 'TRANSFER_INITIATED': {
            // Mark the transaction as pending if it exists (race-safe: create may have beaten us)
            await Transaction.findOneAndUpdate(
                { reference: event.reference },
                { $setOnInsert: { status: 'pending' } },
                { upsert: false },
            );
            break;
        }

        case 'TRANSFER_COMPLETED': {
            // Stamp kafkaOffset + mark notificationSent on the completed transaction
            const updated = await Transaction.findOneAndUpdate(
                { reference: event.reference },
                {
                    $set: {
                        kafkaOffset: offset,
                        notificationSent: true,
                        status: 'completed',
                    },
                },
                { new: true },
            );

            if (!updated) {
                console.warn(
                    `[TransactionConsumer] TRANSFER_COMPLETED — no Transaction found for ref=${event.reference}`,
                );
            } else {
                console.log(
                    `[TransactionConsumer] TRANSFER_COMPLETED — offset=${offset} saved, notificationSent=true ref=${event.reference}`,
                );
            }
            break;
        }

        case 'TRANSFER_FAILED': {
            await Transaction.findOneAndUpdate(
                { reference: event.reference },
                { $set: { status: 'failed' } },
            );
            console.log(`[TransactionConsumer] TRANSFER_FAILED — status=failed ref=${event.reference}`);
            break;
        }

        default: {
            console.warn(`[TransactionConsumer] Unknown event type: ${(event as any).type}`);
        }
    }
}
