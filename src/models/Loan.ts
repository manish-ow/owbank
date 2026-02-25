import mongoose, { Schema, Document } from 'mongoose';

export interface ILoan extends Document {
  userId: mongoose.Types.ObjectId;
  accountNumber: string;
  amount: number;
  interestRate: number;
  tenure: number; // months
  emiAmount: number;
  purpose: string;
  status: 'applied' | 'approved' | 'rejected' | 'disbursed' | 'closed';
  creditScore: number;
  remainingAmount: number;
  createdAt: Date;
}

const LoanSchema = new Schema<ILoan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    tenure: { type: Number, required: true },
    emiAmount: { type: Number, required: true },
    purpose: { type: String, required: true },
    status: {
      type: String,
      enum: ['applied', 'approved', 'rejected', 'disbursed', 'closed'],
      default: 'applied',
    },
    creditScore: { type: Number },
    remainingAmount: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);
