import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import cookieParser from 'cookie-parser'
import userRouter from "./routes/userRoutes";
import projectRouter from './routes/projectRoutes'

const app = express()

const PORT = process.env.PORT || 4000
dotenv.config();
connectDB();

// parsers
app.use(express.json());
app.use(cookieParser());

app.use(
    cors({
        origin: process.env.FRONTEND_URL,     
        credentials: true       
    })
);

app.use('/api/v1/auth',userRouter)
app.use('/api/v1',projectRouter)

app.get("/", (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: "Your server is up and running...",
  });
});

app.listen(PORT , () => {
    console.log(`Server is live at port no. ${PORT}`)
})
