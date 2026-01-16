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
app.use(cors());
app.use(clerkMiddleware());
app.use(express.json()); // Make sure JSON parsing is enabled globally

// Routes
app.get('/', (req, res) => res.send("API Working"));

// Clerk and Stripe webhooks
app.post('/clerk', express.json(), clerkWebhooks);
app.post('/stripe', epxress.raw({ type: 'application/json' }), stripeWebhooks);

// PDFMonkey Certificate Webhook
// Note: PDFMonkey will POST JSON, we verify secret inside controller
app.post('/certificate-webhook',express.json(), certificateWebhook);

// App routes
app.use('/api/educator', educatorRouter);
app.use('/api/course', courseRouter);
app.use('/api/user', userRouter);


// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
