import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as clientService from './client.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import { CreateClientInput, UpdateClientInput, UploadReportInput } from './client.validators.js';

export const createClient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body as CreateClientInput;
    const client = await clientService.createClient(body, req.user?.userId);
    sendSuccess(res, client, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getAllClients = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const { clients, total } = await clientService.getAllClients({ page, limit });
    sendPaginated(res, clients, page, limit, total);
  } catch (error) {
    next(error);
  }
};

export const getClientById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const client = await clientService.getClientById(req.params.id);
    sendSuccess(res, client);
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body as UpdateClientInput;
    const client = await clientService.updateClient(req.params.id, body, req.user?.userId);
    sendSuccess(res, client);
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await clientService.deleteClient(req.params.id, req.user?.userId);
    sendSuccess(res, { message: 'Client deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- Client Reports (Admin) ---

export const getClientReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const { reports, total } = await clientService.getClientReports(req.params.clientId, {
      page,
      limit,
    });
    sendPaginated(res, reports, page, limit, total);
  } catch (error) {
    next(error);
  }
};

export const uploadReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { clientId, patientId, title, description } = req.body as UploadReportInput;
    const file = req.file;
    if (!file) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, error: { message: 'File is required' } });
      return;
    }

    const report = await clientService.uploadReport(
      {
        clientId,
        patientId,
        title,
        description,
        fileUrl: `/uploads/reports/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
      },
      req.user!.userId,
    );
    sendSuccess(res, report, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

export const deleteReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await clientService.deleteReport(req.params.reportId);
    sendSuccess(res, { message: 'Report deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- Client self-service ---

export const getMyReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const { reports, total } = await clientService.getMyReports(req.user!.userId, { page, limit });
    sendPaginated(res, reports, page, limit, total);
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const client = await clientService.getClientById(req.user!.userId);
    sendSuccess(res, client);
  } catch (error) {
    next(error);
  }
};

export const uploadMyReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { title, description, patientId } = req.body as {
      title: string;
      description?: string;
      patientId?: string;
    };
    const file = req.file;
    if (!file) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, error: { message: 'File is required' } });
      return;
    }

    const report = await clientService.uploadReport(
      {
        clientId: req.user!.userId,
        patientId,
        title,
        description,
        fileUrl: `/uploads/reports/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
      },
      req.user!.userId,
    );
    sendSuccess(res, report, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getReportById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const report = await clientService.getReportById(req.params.reportId);
    // If client role, ensure they can only see their own reports
    if (req.user?.role === 'CLIENT' && report.clientId !== req.user.userId) {
      res
        .status(StatusCodes.FORBIDDEN)
        .json({ success: false, error: { message: 'Access denied' } });
      return;
    }
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};

// --- Client Patients ---

export const getClientPatients = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const { patients, total } = await clientService.getClientPatients(req.params.clientId, {
      page,
      limit,
    });
    sendPaginated(res, patients, page, limit, total);
  } catch (error) {
    next(error);
  }
};

export const getMyPatients = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const { patients, total } = await clientService.getMyPatients(req.user!.userId, {
      page,
      limit,
    });
    sendPaginated(res, patients, page, limit, total);
  } catch (error) {
    next(error);
  }
};
