import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

interface PatientInfo {
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: Date | string;
  gender: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  bloodGroup?: string | null;
}

interface TestResult {
  testName: string;
  testCode: string;
  category: string;
  value: string;
  unit?: string | null;
  referenceRange?: string | null;
  isAbnormal: boolean;
  remarks?: string | null;
  status: string;
}

interface ReportData {
  reportNumber: string;
  status: string;
  visitNumber: string;
  generatedAt?: Date | string | null;
  approvedAt?: Date | string | null;
  approvedBy?: { firstName: string; lastName: string } | null;
  notes?: string | null;
  createdAt: Date | string;
  patient: PatientInfo;
  testResults: TestResult[];
}

const COLORS = {
  primary: '#1e40af' as const, // blue-800
  secondary: '#1e3a5f' as const, // dark blue
  accent: '#2563eb' as const, // blue-600
  text: '#1f2937' as const, // gray-800
  textLight: '#6b7280' as const, // gray-500
  border: '#d1d5db' as const, // gray-300
  headerBg: '#eff6ff' as const, // blue-50
  abnormal: '#dc2626' as const, // red-600
  success: '#16a34a' as const, // green-600
  white: '#ffffff' as const,
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateAge(dob: Date | string): string {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} years`;
}

export function generateReportPDF(data: ReportData): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 50, right: 50 },
    bufferPages: true,
  });

  doc.pipe(stream);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ─── HEADER / LETTERHEAD ─────────────────────────────────
  doc.fontSize(22).fillColor(COLORS.primary).text('Care Diagnostics', { align: 'center' });

  doc
    .fontSize(9)
    .fillColor(COLORS.textLight)
    .text('Advanced Laboratory & Diagnostic Centre', { align: 'center' })
    .text('123 Healthcare Avenue, Medical District, New Delhi - 110001', { align: 'center' })
    .text('Phone: +91 11 2345 6789  |  Email: reports@carediagnostics.in  |  NABL Accredited', {
      align: 'center',
    });

  doc.moveDown(0.3);

  // horizontal rule
  const hrY = doc.y;
  doc
    .moveTo(doc.page.margins.left, hrY)
    .lineTo(doc.page.width - doc.page.margins.right, hrY)
    .strokeColor(COLORS.accent)
    .lineWidth(2)
    .stroke();

  doc.moveDown(0.5);

  // ─── REPORT TITLE BAR ────────────────────────────────────
  const titleBarY = doc.y;
  doc.rect(doc.page.margins.left, titleBarY, pageWidth, 24).fill(COLORS.primary);
  doc
    .fontSize(12)
    .fillColor(COLORS.white)
    .text('DIAGNOSTIC REPORT', doc.page.margins.left, titleBarY + 6, {
      align: 'center',
      width: pageWidth,
    });

  doc.y = titleBarY + 32;

  // ─── REPORT METADATA ─────────────────────────────────────
  const metaStartY = doc.y;
  const colMid = doc.page.margins.left + pageWidth / 2;

  doc.fontSize(8).fillColor(COLORS.textLight);
  doc.text('Report Number:', doc.page.margins.left, metaStartY);
  doc.text('Visit Number:', doc.page.margins.left, metaStartY + 14);
  doc.text('Report Status:', doc.page.margins.left, metaStartY + 28);

  doc.text('Report Date:', colMid, metaStartY);
  doc.text('Approved Date:', colMid, metaStartY + 14);
  doc.text('Approved By:', colMid, metaStartY + 28);

  doc.fontSize(9).fillColor(COLORS.text);
  doc.text(data.reportNumber, doc.page.margins.left + 85, metaStartY);
  doc.text(data.visitNumber, doc.page.margins.left + 85, metaStartY + 14);
  doc.text(data.status, doc.page.margins.left + 85, metaStartY + 28);

  doc.text(formatDateTime(data.generatedAt || data.createdAt), colMid + 85, metaStartY);
  doc.text(formatDateTime(data.approvedAt), colMid + 85, metaStartY + 14);
  doc.text(
    data.approvedBy ? `Dr. ${data.approvedBy.firstName} ${data.approvedBy.lastName}` : '—',
    colMid + 85,
    metaStartY + 28,
  );

  doc.y = metaStartY + 48;

  // ─── PATIENT INFORMATION ─────────────────────────────────
  drawSectionHeader(doc, 'PATIENT INFORMATION', pageWidth);

  const patY = doc.y;
  const patCol2 = colMid;

  const patientFields = [
    ['Patient Name:', `${data.patient.firstName} ${data.patient.lastName}`],
    ['MRN:', data.patient.mrn],
    [
      'Date of Birth:',
      `${formatDate(data.patient.dateOfBirth)} (${calculateAge(data.patient.dateOfBirth)})`,
    ],
  ];

  const patientFields2 = [
    ['Gender:', data.patient.gender],
    ['Phone:', data.patient.phone],
    ['Blood Group:', data.patient.bloodGroup || '—'],
  ];

  let py = patY;
  for (const [label, value] of patientFields) {
    doc.fontSize(8).fillColor(COLORS.textLight).text(label, doc.page.margins.left, py);
    doc
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(value, doc.page.margins.left + 85, py);
    py += 14;
  }

  py = patY;
  for (const [label, value] of patientFields2) {
    doc.fontSize(8).fillColor(COLORS.textLight).text(label, patCol2, py);
    doc
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(value, patCol2 + 85, py);
    py += 14;
  }

  doc.y = py + 8;

  // ─── TEST RESULTS TABLE ──────────────────────────────────
  drawSectionHeader(doc, 'TEST RESULTS', pageWidth);

  // Table header
  const tableX = doc.page.margins.left;
  const colWidths = [
    pageWidth * 0.28, // Test Name
    pageWidth * 0.12, // Code
    pageWidth * 0.15, // Result
    pageWidth * 0.1, // Unit
    pageWidth * 0.2, // Reference Range
    pageWidth * 0.15, // Status
  ];
  const colHeaders = ['Test Name', 'Code', 'Result', 'Unit', 'Ref. Range', 'Status'];

  let tableY = doc.y;

  // header row
  doc.rect(tableX, tableY, pageWidth, 18).fill('#e0e7ff');
  let cx = tableX;
  for (let i = 0; i < colHeaders.length; i++) {
    doc
      .fontSize(7.5)
      .fillColor(COLORS.secondary)
      .text(colHeaders[i], cx + 4, tableY + 5, { width: colWidths[i] - 8 });
    cx += colWidths[i];
  }

  tableY += 18;

  // data rows
  for (let r = 0; r < data.testResults.length; r++) {
    const result = data.testResults[r];
    const rowH = 20;

    // check if we need a new page
    if (tableY + rowH > doc.page.height - doc.page.margins.bottom - 60) {
      doc.addPage();
      tableY = doc.page.margins.top;
      // re-draw header on new page
      doc.rect(tableX, tableY, pageWidth, 18).fill('#e0e7ff');
      let hx = tableX;
      for (let i = 0; i < colHeaders.length; i++) {
        doc
          .fontSize(7.5)
          .fillColor(COLORS.secondary)
          .text(colHeaders[i], hx + 4, tableY + 5, { width: colWidths[i] - 8 });
        hx += colWidths[i];
      }
      tableY += 18;
    }

    // alternating row background
    if (r % 2 === 0) {
      doc.rect(tableX, tableY, pageWidth, rowH).fill('#f9fafb');
    }

    cx = tableX;
    const rowValues = [
      result.testName,
      result.testCode,
      result.value,
      result.unit || '—',
      result.referenceRange || '—',
      result.status,
    ];

    for (let i = 0; i < rowValues.length; i++) {
      const isResultCol = i === 2;
      const color = isResultCol && result.isAbnormal ? COLORS.abnormal : COLORS.text;

      doc.fontSize(8).fillColor(color);
      let text = rowValues[i];
      if (isResultCol && result.isAbnormal) {
        text = `${text} ⬆`;
      }
      doc.text(text, cx + 4, tableY + 6, { width: colWidths[i] - 8 });
      cx += colWidths[i];
    }

    // draw bottom border for row
    doc
      .moveTo(tableX, tableY + rowH)
      .lineTo(tableX + pageWidth, tableY + rowH)
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke();

    tableY += rowH;
  }

  // draw table outer border
  doc
    .rect(tableX, doc.y - (data.testResults.length > 0 ? 0 : 0), pageWidth, 0)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  doc.y = tableY + 8;

  // ─── REMARKS ─────────────────────────────────────────────
  const resultsWithRemarks = data.testResults.filter((r) => r.remarks);
  if (resultsWithRemarks.length > 0) {
    // Check if we need new page
    if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
    drawSectionHeader(doc, 'REMARKS', pageWidth);
    for (const r of resultsWithRemarks) {
      doc
        .fontSize(8)
        .fillColor(COLORS.text)
        .text(`${r.testName}: `, doc.page.margins.left, doc.y, { continued: true })
        .fillColor(COLORS.textLight)
        .text(r.remarks || '');
      doc.moveDown(0.2);
    }
    doc.moveDown(0.5);
  }

  // ─── NOTES ───────────────────────────────────────────────
  if (data.notes) {
    if (doc.y + 40 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
    drawSectionHeader(doc, 'NOTES', pageWidth);
    doc.fontSize(8).fillColor(COLORS.text).text(data.notes, doc.page.margins.left);
    doc.moveDown(0.5);
  }

  // ─── FOOTER / SIGNATURE ──────────────────────────────────
  // Make sure there's room for the footer
  if (doc.y + 100 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }

  const footerY = doc.page.height - doc.page.margins.bottom - 80;

  doc
    .moveTo(doc.page.margins.left, footerY)
    .lineTo(doc.page.width - doc.page.margins.right, footerY)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  // Signature block
  if (data.approvedBy) {
    doc
      .fontSize(8)
      .fillColor(COLORS.textLight)
      .text('Approved & Verified By:', doc.page.width - doc.page.margins.right - 200, footerY + 8);
    doc
      .fontSize(10)
      .fillColor(COLORS.text)
      .text(
        `Dr. ${data.approvedBy.firstName} ${data.approvedBy.lastName}`,
        doc.page.width - doc.page.margins.right - 200,
        footerY + 20,
      );
    doc
      .fontSize(7)
      .fillColor(COLORS.textLight)
      .text('Pathologist', doc.page.width - doc.page.margins.right - 200, footerY + 32);
  }

  // Disclaimer
  doc
    .fontSize(6.5)
    .fillColor(COLORS.textLight)
    .text(
      'This report is confidential and intended only for the use of the individual patient. Results relate to the samples as received. ' +
        'This is a computer-generated report and does not require a physical signature if digitally approved.',
      doc.page.margins.left,
      footerY + 50,
      { width: pageWidth, align: 'center' },
    );

  // Page numbers
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(7)
      .fillColor(COLORS.textLight)
      .text(`Page ${i + 1} of ${pages.count}`, doc.page.margins.left, doc.page.height - 25, {
        width: pageWidth,
        align: 'center',
      });
  }

  doc.end();
  return stream;
}

function drawSectionHeader(doc: PDFKit.PDFDocument, title: string, pageWidth: number) {
  const y = doc.y;
  doc.rect(doc.page.margins.left, y, pageWidth, 16).fill('#f0f4ff');
  doc
    .fontSize(9)
    .fillColor(COLORS.secondary)
    .text(title, doc.page.margins.left + 8, y + 4, { width: pageWidth });
  doc.y = y + 22;
}
