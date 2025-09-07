import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  projectId: {
    type: String,
    required: true
  },
  projectName: {
    type: String,
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedEmail: {
    type: String,
    required: true
  },
  invitedRole: {
    type: String,
    enum: ['reader', 'editor'],
    default: 'reader',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired invitations
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Invitation', invitationSchema); 