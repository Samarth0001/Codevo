import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_URL as string);
    console.log("DB Connection Successful");
  } catch (err) {
    console.error("DB Connection Failed!");
    console.error(err);
    process.exit(1);
  }
};