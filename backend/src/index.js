import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import debug from 'debug';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from '../routes/auth.route.js';
import userRouter from '../routes/user.routes.js';
import subscriptionRouter from '../routes/subscription.routes.js';
import eventRouter from '../routes/event.routes.js';
import groupRouter from '../routes/group.routes.js';
import { connectToDatabase } from './db.js';
import errorMiddleware from '../middleware/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const log = debug('aavahan:server');
// Initialize app first to configure middleware and routes
const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors({
  origin: true, // reflect the request origin, allows file:// and any localhost port
  credentials: true,
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);
app.use('/api/v1/events', eventRouter);
app.use('/api/v1/groups', groupRouter);

// Global error handling middleware (must be after all routes)
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  log(`api is running on port ${PORT}`);
  console.log(`api is running on port ${PORT}`);

  await connectToDatabase();
});

export default app;
