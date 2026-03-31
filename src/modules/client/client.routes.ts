import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import * as clientController from './client.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createClientSchema, updateClientSchema, clientListSchema } from './client.validators.js';
import { Role } from '@prisma/client';

const router = Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'reports'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, DOC, DOCX files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticate);

// ==================== CLIENT SELF-SERVICE ROUTES (must be before /:id) ====================

// Get own reports (CLIENT)
router.get(
  '/me/reports',
  authorize(Role.CLIENT),
  (req, res, next) => void clientController.getMyReports(req, res, next),
);

// Get own profile (CLIENT)
router.get(
  '/me/profile',
  authorize(Role.CLIENT),
  (req, res, next) => void clientController.getMyProfile(req, res, next),
);

// Upload own report (CLIENT)
router.post(
  '/me/reports/upload',
  authorize(Role.CLIENT),
  upload.single('file'),
  (req, res, next) => void clientController.uploadMyReport(req, res, next),
);

// Get own patients (CLIENT)
router.get(
  '/me/patients',
  authorize(Role.CLIENT),
  (req, res, next) => void clientController.getMyPatients(req, res, next),
);

// ==================== REPORT ROUTES (must be before /:id) ====================

// Upload report for a client (ADMIN only)
router.post(
  '/reports/upload',
  authorize(Role.ADMIN),
  upload.single('file'),
  (req, res, next) => void clientController.uploadReport(req, res, next),
);

// Delete a report (ADMIN)
router.delete(
  '/reports/:reportId',
  authorize(Role.ADMIN),
  (req, res, next) => void clientController.deleteReport(req, res, next),
);

// Get single report by ID (ADMIN or CLIENT)
router.get(
  '/reports/:reportId',
  authorize(Role.ADMIN, Role.CLIENT),
  (req, res, next) => void clientController.getReportById(req, res, next),
);

// ==================== ADMIN CRUD ROUTES ====================

// List clients (ADMIN only)
router.get(
  '/',
  authorize(Role.ADMIN),
  validate(clientListSchema, 'query'),
  (req, res, next) => void clientController.getAllClients(req, res, next),
);

// Create client (ADMIN only)
router.post(
  '/',
  authorize(Role.ADMIN),
  validate(createClientSchema),
  (req, res, next) => void clientController.createClient(req, res, next),
);

// Get reports for a specific client (ADMIN)
router.get(
  '/:clientId/reports',
  authorize(Role.ADMIN),
  (req, res, next) => void clientController.getClientReports(req, res, next),
);

// Get patients for a specific client (ADMIN)
router.get(
  '/:clientId/patients',
  authorize(Role.ADMIN),
  (req, res, next) => void clientController.getClientPatients(req, res, next),
);

// Get client by ID (ADMIN)
router.get(
  '/:id',
  authorize(Role.ADMIN),
  (req, res, next) => void clientController.getClientById(req, res, next),
);

// Update client (ADMIN)
router.patch(
  '/:id',
  authorize(Role.ADMIN),
  validate(updateClientSchema),
  (req, res, next) => void clientController.updateClient(req, res, next),
);

// Delete client (ADMIN)
router.delete(
  '/:id',
  authorize(Role.ADMIN),
  (req, res, next) => void clientController.deleteClient(req, res, next),
);

export default router;
