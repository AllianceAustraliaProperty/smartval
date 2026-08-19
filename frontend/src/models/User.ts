import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  username: string;
  displayName: string;
  role: 'admin' | 'valuer';
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'valuer'], default: 'valuer' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Create indexes for lightning-fast lookups during login
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ firebaseUid: 1 });

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
