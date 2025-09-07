import mongoose, { Document, Schema } from "mongoose";

export interface IPremium extends Document {
  user: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  paymentId: string;        // Payment gateway transaction ID (Stripe, Razorpay, etc.)
  isRecurring: boolean;
}

const premiumSchema = new Schema<IPremium>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",             // Reference to the User model
    required: true,
  },

  startDate: {
    type: Date,
    required: true,
  },

  endDate: {
    type: Date,
    required: true,
  },

  paymentId: {
    type: String,
    required: true,
  },

  isRecurring: {
    type: Boolean,
    default: false,
  },
});

const Premium = mongoose.model<IPremium>("Premium", premiumSchema);
export default Premium
