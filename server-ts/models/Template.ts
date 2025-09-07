import mongoose from "mongoose";

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },           // e.g., "Python Starter"
  slug: { type: String, required: true, unique: true }, // e.g., "python-starter"
  description: { type: String },                    // brief summary of the template
  language: { type: String, required: true },       // e.g., "python", "javascript"
  icon: { type: String },                           // optional icon URL or name
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
});

export default mongoose.model('Template', templateSchema);
