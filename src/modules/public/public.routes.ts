import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { reportIncludes } from '../report/report.repository.js';
import { sendError, sendSuccess } from '../../shared/utils/apiResponse.js';

const router = Router();

const reportLookupSchema = z.object({
  reportNumber: z.string().min(3),
  phone: z.string().regex(/^[6-9]\d{9}$/),
});

router.post('/report-lookup', async (req, res, next) => {
  try {
    const result = reportLookupSchema.safeParse(req.body);
    if (!result.success) {
      sendError(
        res,
        'Report not found or not published',
        StatusCodes.NOT_FOUND,
        'REPORT_LOOKUP_NOT_FOUND',
      );
      return;
    }

    const report = await prisma.report.findFirst({
      where: {
        reportNumber: result.data.reportNumber,
        status: 'DISPATCHED',
        deletedAt: null,
        visit: {
          patient: {
            phone: result.data.phone,
            deletedAt: null,
          },
          deletedAt: null,
        },
      },
      include: reportIncludes,
    });

    if (!report) {
      sendError(
        res,
        'Report not found or not published',
        StatusCodes.NOT_FOUND,
        'REPORT_LOOKUP_NOT_FOUND',
      );
      return;
    }

    sendSuccess(res, report, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
});

export default router;
