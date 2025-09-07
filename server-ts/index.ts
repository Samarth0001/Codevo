import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import cookieParser from 'cookie-parser'
import userRouter from "./routes/userRoutes";
import projectRouter from './routes/projectRoutes'
import invitationRouter from './routes/invitationRoutes'
import githubRouter from './routes/githubRoutes'
import aiRouter from './routes/aiRoutes'
import explanationRouter from './routes/explanationRoutes'
import passwordResetRouter from './routes/passwordResetRoutes'
import startCleanupListener from './services/cleanupListener'

const app = express()

const PORT = process.env.PORT || 4000
dotenv.config();
connectDB();

// Start Redis cleanup listener
startCleanupListener();

// parsers
app.use(express.json());
app.use(cookieParser());

// const corsOptions = {
//   origin: ['https://www.codevo.live', 'https://codevo.live'],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// };

// app.use(cors(corsOptions));
// CORS configuration for different environments
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://www.codevo.live',
      'https://codevo.live',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];
    
    // For development, allow any localhost or 127.0.0.1 with any port
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// app.use(   
//     cors({
//         origin: [
//           'http://localhost:5173',
//           'http://codevo.live',
//           'https://codevo.live',
//           'https://www.codevo.live'
//         ],
//         credentials: true       
//     })
// );

app.use('/api/v1/auth',userRouter)
app.use('/api/v1',projectRouter)
app.use('/api/v1/invite',invitationRouter)
app.use('/api/v1/github',githubRouter)
app.use('/api/v1/ai', aiRouter)
app.use('/api/v1/explain', explanationRouter)
app.use('/api/v1/password-reset', passwordResetRouter)

app.get("/", (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: "Your server is up and running...",
  });
});

// Debug endpoint to check cookie configuration
app.get("/debug/cookie-config", (req: Request, res: Response): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = isProduction || process.env.HTTPS === 'true';
  const protocol = req.protocol;
  const host = req.get('host');
  const origin = req.get('origin');
  
  res.status(200).json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      HTTPS: process.env.HTTPS,
      isProduction,
      isHttps,
      protocol,
      host,
      origin,
      cookieConfig: {
        secure: isHttps,
        sameSite: 'none',
        httpOnly: true,
        explanation: isHttps 
          ? "HTTPS: secure=true, sameSite=none (cross-origin with HTTPS)"
          : "HTTP: secure=false, sameSite=none (cross-origin with HTTP - requires HTTPS=false)"
      },
      note: "Using sameSite='none' for cross-origin setup (localhost frontend -> server.127.0.0.1.sslip.io server)"
    }
  });
});

app.listen(PORT , () => {
    console.log(`Server is live at port no. ${PORT}`)
})
