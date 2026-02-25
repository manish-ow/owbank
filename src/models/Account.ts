import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountNumber: string; // OWXXXXX format
  accountType: 'savings' | 'checking';
  balance: number;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  kycVerified: boolean;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountNumber: { type: String, required: true, unique: true },
    accountType: { type: String, enum: ['savings', 'checking'], default: 'savings' },
    balance: { type: Number, default: 1000, min: 0 }, // $1000 bonus on open
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['active', 'frozen', 'closed'], default: 'active' },
    kycVerified: { type: Boolean, default: false },
    fullName: { type: String, required: true },
    dateOfBirth: { type: String },
    phone: { type: String },
    address: { type: String },
  },
  { timestamps: true }
);

// Generate unique OWXXXXX account number
AccountSchema.pre('save', async function () {
  if (this.isNew && !this.accountNumber) {
    const count = await mongoose.models.Account.countDocuments();
    this.accountNumber = `OW${String(count + 10001).padStart(5, '0')}`;
  }
});

export default mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);
