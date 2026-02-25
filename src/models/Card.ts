import mongoose, { Schema, Document } from 'mongoose';

export interface ICard extends Document {
  userId: mongoose.Types.ObjectId;
  accountNumber: string;
  cardNumber: string;
  cardType: 'standard' | 'gold' | 'platinum';
  creditLimit: number;
  usedCredit: number;
  status: 'active' | 'frozen' | 'cancelled';
  expiryDate: string;
  cvv: string;
  cyberInsurance: boolean;
  rewardsPoints: number;
  createdAt: Date;
}

const CardSchema = new Schema<ICard>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountNumber: { type: String, required: true },
    cardNumber: { type: String, required: true, unique: true },
    cardType: { type: String, enum: ['standard', 'gold', 'platinum'], default: 'standard' },
    creditLimit: { type: Number, required: true },
    usedCredit: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'frozen', 'cancelled'], default: 'active' },
    expiryDate: { type: String, required: true },
    cvv: { type: String, required: true },
    cyberInsurance: { type: Boolean, default: false },
    rewardsPoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Card || mongoose.model<ICard>('Card', CardSchema);
