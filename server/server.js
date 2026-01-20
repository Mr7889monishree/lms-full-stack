import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/mongodb.js';
import connectCloudinary from './configs/cloudinary.js';
import userRouter from './routes/userRoutes.js';
import { clerkMiddleware } from '@clerk/express';
import { certificateWebhook, clerkWebhooks, stripeWebhooks } from './controllers/webhooks.js';
import educatorRouter from './routes/educatorRoutes.js';
import courseRouter from './routes/courseRoute.js';

// Initialize Express
const app = express();

// Connect to database
await connectDB();
await connectCloudinary();

// Middlewares
// Middlewares
// ===== CORS FIRST (VERY IMPORTANT) =====
app.use(
  cors({
    origin: ['https://lms-full-stack-frontend-drab.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Handle preflight requests explicitly
app.options('*', cors());

// ===== THEN Clerk =====
app.use(clerkMiddleware());

// Routes
app.get('/', (req, res) => res.send("API Working"));

// Clerk webhook (still JSON)
app.post('/clerk', express.json(), clerkWebhooks);

// Stripe webhook (raw body for signature verification)
app.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

// PDFMonkey Certificate Webhook
app.post('/certificate-webhook', express.json(), certificateWebhook);

// App routes with JSON parsing
app.use(express.json()); // Apply JSON parsing AFTER webhooks
app.use('/api/educator', educatorRouter);
app.use('/api/course', courseRouter);
app.use('/api/user', userRouter);

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
