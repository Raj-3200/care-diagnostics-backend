import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import patientRoutes from './modules/patient/patient.routes.js';
import visitRoutes from './modules/visit/visit.routes.js';
import testRoutes from './modules/test/test.routes.js';
import testOrderRoutes from './modules/testOrder/testOrder.routes.js';
import sampleRoutes from './modules/sample/sample.routes.js';
import resultRoutes from './modules/result/result.routes.js';
import reportRoutes from './modules/report/report.routes.js';
import invoiceRoutes from './modules/invoice/invoice.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';
import clientRoutes from './modules/client/client.routes.js';
import { NotFoundError } from './shared/errors/AppError.js';
import { setupSwagger } from './config/swagger.js';

const app = express();

const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
const allowAllOrigins = allowedOrigins.includes('*');

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: allowAllOrigins ? true : allowedOrigins,
    credentials: true, // Always true for cookie-based auth
  }),
);

// Cookie parser (before routes, for httpOnly token auth)
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Request logging
app.use(requestLogger);

// Swagger API docs
setupSwagger(app);

// API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/visits', visitRoutes);
app.use('/api/v1/tests', testRoutes);
app.use('/api/v1/test-orders', testOrderRoutes);
app.use('/api/v1/samples', sampleRoutes);
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/clients', clientRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use((req: Request, _res: Response) => {
  throw new NotFoundError(`Route ${req.method} ${req.path} not found`);
});

// Global error handler
app.use(errorHandler);

export default app;
