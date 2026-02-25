import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  reference: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'bill_payment' | 'bonus';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  kafkaOffset?: string;
  notificationSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    reference: { type: String, required: true, unique: true },
    fromAccount: { type: String, required: true },
    toAccount: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    type: {
      type: String,
      enum: ['transfer', 'deposit', 'withdrawal', 'bill_payment', 'bonus'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    description: { type: String, default: '' },
    kafkaOffset: { type: String },
    notificationSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TransactionSchema.index({ fromAccount: 1, createdAt: -1 });
TransactionSchema.index({ toAccount: 1, createdAt: -1 });

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);
