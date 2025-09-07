import mongoose, { Document, Schema } from 'mongoose';

export interface IExplainChatSession extends Document {
  user: mongoose.Types.ObjectId;
  messages: Array<{
    role: 'user' | 'model' | 'system';
    content: string;
  }>;
  callCount: number;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExplainChatSessionSchema = new Schema<IExplainChatSession>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'model', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    }
  }],
  callCount: {
    type: Number,
    default: 0
  },
  title: {
    type: String,
    default: 'New Chat'
  }
}, {
  timestamps: true
});

// Index for efficient querying by user
ExplainChatSessionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IExplainChatSession>('ExplainChatSession', ExplainChatSessionSchema);
