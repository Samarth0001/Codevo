import mongoose, { Schema, Types } from 'mongoose';

const chatMessageSchema = new Schema({
  role: { type: String, enum: ['user', 'model', 'system'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const chatSessionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'New Chat' },
  messages: { type: [chatMessageSchema], default: [] },
  callCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

chatSessionSchema.pre('save', function(next) {
  this.set('updatedAt', new Date());
  next();
});

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;


