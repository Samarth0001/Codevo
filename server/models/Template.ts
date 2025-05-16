import mongoose from "mongoose";

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },           // e.g., "Python Starter"
  description: { type: String },                    // brief summary of the template
  language: { type: String, required: true },       // e.g., "python", "javascript"
  icon: { type: String },                           // optional icon URL or name
});

module.exports = mongoose.model('Template', templateSchema);
