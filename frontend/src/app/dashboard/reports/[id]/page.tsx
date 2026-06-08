'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/api';
import { canDownloadReport, getDiagnosticWorkflow } from '@/lib/workflow';
import {
  approveReport as approveReportRequest,
  dispatchReport as dispatchReportRequest,
  downloadReportPdf,
  generateReport as generateReportRequest,
  getReport,
} from '@/services/reports';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
  RESULT_STATUS_LABELS,
  RESULT_STATUS_COLORS,
} from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Download,
  FileText,
  User,
  FlaskConical,
  AlertTriangle,
  Calendar,
  CheckCircle,
  FileUp,
  Send,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/shared/animations';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      const data = await getReport(id);
      return data.data;
    },
  });

  const generateReport = useMutation({
    mutationFn: async () => {
      await generateReportRequest(id);
    },
    onSuccess: () => {
      toast.success('Report generated successfully');
      qc.invalidateQueries({ queryKey: ['report', id] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const approveReport = useMutation({
    mutationFn: async () => {
      await approveReportRequest(id);
    },
    onSuccess: () => {
      toast.success('Report approved');
      qc.invalidateQueries({ queryKey: ['report', id] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const dispatchReport = useMutation({
    mutationFn: async () => {
      await dispatchReportRequest(id);
    },
    onSuccess: () => {
      toast.success('Report dispatched');
      qc.invalidateQueries({ queryKey: ['report', id] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleDownloadPDF = async () => {
    if (!report || !canDownloadReport(report)) {
      toast.error('Download is available after the report is approved.');
      return;
    }

    try {
      const blob = await downloadReportPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report?.reportNumber || 'report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Report downloaded successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl lg:col-span-2" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!report) return <p className="py-12 text-center text-muted-foreground">Report not found.</p>;

  const patient = report.visit?.patient;
  const testOrders = report.visit?.testOrders ?? [];
  const workflow = getDiagnosticWorkflow(testOrders);
  const downloadReady = canDownloadReport(report);

  return (
    <PageTransition>
      <PageHeader
        title={`Report ${report.reportNumber}`}
        description={patient ? `${patient.firstName} ${patient.lastName} (${patient.mrn})` : ''}
        backHref="/dashboard/reports"
      />

      {/* Action Bar */}
      <FadeIn>
        <div className="mb-6 flex items-center justify-between rounded-xl border border-border/40 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08]">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[14px] font-semibold">{report.reportNumber}</span>
                <StatusBadge
                  status={report.status}
                  colorMap={REPORT_STATUS_COLORS}
                  labelMap={REPORT_STATUS_LABELS}
                />
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Created {format(new Date(report.createdAt), 'dd MMM yyyy, hh:mm a')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report.status === 'PENDING' && (
              <Button
                variant="outline"
                onClick={() => generateReport.mutate()}
                disabled={generateReport.isPending || !workflow.reportReady}
                title={workflow.reportReady ? 'Generate report' : workflow.reason}
                className="rounded-lg"
              >
                {generateReport.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="mr-1.5 h-4 w-4" />
                )}
                Generate
              </Button>
            )}
            {report.status === 'GENERATED' && (
              <Button
                variant="outline"
                onClick={() => approveReport.mutate()}
                disabled={approveReport.isPending}
                className="rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              >
                {approveReport.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                )}
                Approve
              </Button>
            )}
            {report.status === 'APPROVED' && (
              <Button
                variant="outline"
                onClick={() => dispatchReport.mutate()}
                disabled={dispatchReport.isPending}
                className="rounded-lg border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
              >
                {dispatchReport.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                Dispatch
              </Button>
            )}
            <Button
              onClick={handleDownloadPDF}
              disabled={!downloadReady}
              title={downloadReady ? 'Download PDF' : 'Download after approval'}
              className="rounded-lg shadow-sm"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card p-4 shadow-sm">
          <div>
            <p className={`text-[13.5px] font-semibold ${workflow.reportReady ? 'text-emerald-600' : 'text-amber-600'}`}>
              {workflow.reportReady ? 'All report prerequisites are complete' : workflow.reason}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {workflow.collected}/{workflow.total} samples collected · {workflow.processed}/
              {workflow.total} processed · {workflow.verified}/{workflow.total} results verified
            </p>
          </div>
          {!workflow.reportReady && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(workflow.nextHref)}
              className="h-8 gap-1.5 rounded-lg border-border/50 text-[12px]"
            >
              {workflow.nextLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </FadeIn>

      <StaggerContainer className="grid gap-6 lg:grid-cols-3">
        {/* Report Info */}
        <StaggerItem>
          <Card className="rounded-xl border-border/40 shadow-sm">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/[0.06]">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-[13.5px] font-semibold">Timeline</h3>
              </div>
              <div className="space-y-3 text-[13px]">
                <InfoRow label="Report #" value={report.reportNumber} mono />
                <InfoRow label="Visit #" value={report.visit?.visitNumber || '—'} mono />
                <div className="my-2 border-t border-border/40" />
                <InfoRow
                  label="Created"
                  value={format(new Date(report.createdAt), 'dd MMM yyyy')}
                />
                {report.generatedAt && (
                  <InfoRow
                    label="Generated"
                    value={format(new Date(report.generatedAt), 'dd MMM yyyy')}
                  />
                )}
                {report.approvedAt && (
                  <div>
                    <InfoRow
                      label="Approved"
                      value={format(new Date(report.approvedAt), 'dd MMM yyyy')}
                    />
                    {report.approvedBy && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2.5">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[12px] font-medium text-emerald-700">
                          Dr. {report.approvedBy.firstName} {report.approvedBy.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {report.notes && (
                  <div className="mt-2 rounded-lg bg-muted/30 p-3">
                    <span className="text-[11px] font-medium text-muted-foreground">Notes</span>
                    <p className="mt-0.5 text-[12.5px] text-foreground">{report.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Patient Info */}
        <StaggerItem className="lg:col-span-2">
          <Card className="rounded-xl border-border/40 shadow-sm">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/[0.06]">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-[13.5px] font-semibold">Patient Information</h3>
              </div>
              {patient ? (
                <div className="grid gap-3 text-[13px] sm:grid-cols-2">
                  <div className="flex items-center gap-3 sm:col-span-2 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/[0.08] text-[13px] font-semibold text-primary">
                      {patient.firstName[0]}
                      {patient.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-[12px] text-muted-foreground">MRN: {patient.mrn}</p>
                    </div>
                  </div>
                  <InfoRow
                    label="Date of Birth"
                    value={format(new Date(patient.dateOfBirth), 'dd MMM yyyy')}
                  />
                  <InfoRow label="Gender" value={patient.gender} />
                  <InfoRow label="Phone" value={patient.phone} />
                  {patient.email && <InfoRow label="Email" value={patient.email} />}
                  {patient.bloodGroup && <InfoRow label="Blood Group" value={patient.bloodGroup} />}
                  {patient.address && (
                    <div className="sm:col-span-2">
                      <InfoRow
                        label="Address"
                        value={[patient.address, patient.city, patient.state]
                          .filter(Boolean)
                          .join(', ')}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-4 text-center text-[13px] text-muted-foreground">
                  No patient information available.
                </p>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Test Results */}
      <FadeIn delay={0.15}>
        <Card className="mt-6 rounded-xl border-border/40 shadow-sm">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/[0.06]">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-[13.5px] font-semibold">Test Results</h3>
              {testOrders.length > 0 && (
                <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {testOrders.length}
                </span>
              )}
            </div>
            {testOrders.length === 0 ? (
              <div className="py-8 text-center">
                <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-[13px] text-muted-foreground">No test results available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/40">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b bg-[#F8FAFC]">
                      <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground">
                        Test
                      </th>
                      <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground">
                        Code
                      </th>
                      <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground">
                        Result
                      </th>
                      <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground">
                        Unit
                      </th>
                      <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground">
                        Ref. Range
                      </th>
                      <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {testOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-border/30 last:border-0 transition-colors hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {order.test?.name || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {order.test?.code || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-semibold ${order.result?.isAbnormal ? 'text-destructive' : 'text-foreground'}`}
                            >
                              {order.result?.value || '—'}
                            </span>
                            {order.result?.isAbnormal && (
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {order.result?.unit || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {order.result?.referenceRange || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {order.result ? (
                            <StatusBadge
                              status={order.result.status}
                              colorMap={RESULT_STATUS_COLORS}
                              labelMap={RESULT_STATUS_LABELS}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {order.result?.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
