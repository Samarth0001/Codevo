import mongoose from "mongoose";

const resetPasswordSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    tokenHash: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['FORGOT_PASSWORD', 'CHANGE_PASSWORD'],
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // MongoDB TTL index to auto-delete expired tokens
    },
    used: {
        type: Boolean,
        default: false,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
resetPasswordSchema.index({ userEmail: 1, type: 1 });
resetPasswordSchema.index({ tokenHash: 1 });

const ResetPassword = mongoose.model("ResetPassword", resetPasswordSchema);
export default ResetPassword;
