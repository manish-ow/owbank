import { EachMessagePayload, Kafka, logLevel } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'owbank',
  brokers: [process.env.KAFKA_BROKER!],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME!,
    password: process.env.KAFKA_PASSWORD!,
  },
  logLevel: logLevel.WARN,
});

// ─── Producer ────────────────────────────────────────────────────────────────

export const producer = kafka.producer();
let producerConnected = false;

export async function getProducer() {
  if (!producerConnected) {
    await producer.connect();
    producerConnected = true;
  }
  return producer;
}

export async function publishTransactionEvent(event: {
  type: 'TRANSFER_INITIATED' | 'TRANSFER_COMPLETED' | 'TRANSFER_FAILED';
  fromAccount: string;
  toAccount: string;
  amount: number;
  reference: string;
  timestamp: string;
}) {
  const prod = await getProducer();
  await prod.send({
    topic: 'owbank-transfers',
    messages: [
      {
        key: event.reference,
        value: JSON.stringify(event),
      },
    ],
  });
  return event;
}

// ─── Consumer ─────────────────────────────────────────────────────────────────

export const consumer = kafka.consumer({ groupId: 'owbank-transactions' });
let consumerRunning = false;

/**
 * Starts the Kafka consumer and subscribes it to the owbank-transfers topic.
 * Idempotent — safe to call multiple times; subsequent calls are no-ops.
 *
 * @param handler  - called for every incoming message
 */
export async function startConsumer(
  handler: (payload: EachMessagePayload) => Promise<void>,
): Promise<{ started: boolean }> {
  if (consumerRunning) {
    return { started: false };
  }

  await consumer.connect();
  await consumer.subscribe({ topic: 'owbank-transfers', fromBeginning: false });

  await consumer.run({ eachMessage: handler });

  consumerRunning = true;
  console.log('[Kafka] Consumer connected and subscribed to owbank-transfers');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Kafka] Shutting down consumer...');
    await consumer.disconnect();
    consumerRunning = false;
    process.exit(0);
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  return { started: true };
}

export function isConsumerRunning(): boolean {
  return consumerRunning;
}

export default kafka;
