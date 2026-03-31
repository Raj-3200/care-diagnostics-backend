import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as reportService from './report.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import type { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import { generateReportPDF } from './report.pdf.js';
import type { z } from 'zod';
import type {
  createReportSchema,
  generateReportSchema,
  approveReportSchema,
  dispatchReportSchema,
} from './report.validators.js';

type CreateReportInput = z.infer<typeof createReportSchema>;
type GenerateReportInput = z.infer<typeof generateReportSchema>;
type ApproveReportInput = z.infer<typeof approveReportSchema>;
type DispatchReportInput = z.infer<typeof dispatchReportSchema>;

export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { visitId, notes } = req.body as CreateReportInput;
    const report = await reportService.createReport(visitId, notes, authReq.user!.userId);
    sendSuccess(res, report, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getReportById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportService.getReportById(req.params.id);
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};

export const getReportByNumber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportService.getReportByNumber(req.params.reportNumber);
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};

export const getReportByVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportService.getReportByVisit(req.params.visitId);
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};

export const listReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const status = req.query.status as string | undefined;
    const patientId = req.query.patientId as string | undefined;

    const { reports, total } = await reportService.listReports({
      page,
      limit,
      status,
      patientId,
    });
    sendPaginated(res, reports, page, limit, total);
  } catch (error) {
    next(error);
  }
};

export const generateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { fileUrl, notes } = req.body as GenerateReportInput;
    const report = await reportService.generateReport(
      req.params.id,
      { fileUrl, notes },
      authReq.user!.userId,
    );
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};

export const approveReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { notes } = req.body as ApproveReportInput;
    const report = await reportService.approveReport(req.params.id, notes, authReq.user!.userId);
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};

export const dispatchReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { notes } = req.body as DispatchReportInput;
    const report = await reportService.dispatchReport(req.params.id, notes, authReq.user!.userId);
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};

export const deleteReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await reportService.deleteReport(req.params.id, authReq.user!.userId);
    sendSuccess(res, { message: 'Report deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const downloadReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportService.getReportById(req.params.id);

    const visit = report.visit;
    const patient = visit.patient;
    const testOrders = visit.testOrders ?? [];

    const testResults = testOrders.map((to) => ({
      testName: to.test?.name ?? 'Unknown Test',
      testCode: to.test?.code ?? '—',
      category: to.test?.category ?? 'OTHER',
      value: to.result?.value ?? '—',
      unit: to.result?.unit,
      referenceRange: to.result?.referenceRange,
      isAbnormal: to.result?.isAbnormal ?? false,
      remarks: to.result?.remarks,
      status: to.result?.status ?? 'PENDING',
    }));

    const pdfData = {
      reportNumber: report.reportNumber,
      status: report.status,
      visitNumber: visit.visitNumber,
      generatedAt: report.generatedAt,
      approvedAt: report.approvedAt,
      approvedBy: report.approvedBy
        ? { firstName: report.approvedBy.firstName, lastName: report.approvedBy.lastName }
        : null,
      notes: report.notes,
      createdAt: report.createdAt,
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        mrn: patient.mrn,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        city: patient.city,
        state: patient.state,
        bloodGroup: patient.bloodGroup,
      },
      testResults,
    };

    const pdfStream = generateReportPDF(pdfData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportNumber}.pdf"`);

    pdfStream.pipe(res);
  } catch (error) {
    next(error);
  }
};
