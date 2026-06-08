'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/api';
import { canDownloadReport, getDiagnosticWorkflow } from '@/lib/workflow';
import type { Report } from '@/types';
import {
  approveReport as approveReportRequest,
  dispatchReport as dispatchReportRequest,
  downloadReportPdf,
  generateReport as generateReportRequest,
  listReports,
} from '@/services/reports';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { REPORT_STATUS_LABELS, REPORT_STATUS_COLORS } from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Download, CheckCircle, Send, FileUp, Loader2 } from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';
import { FadeIn } from '@/components/shared/animations';

export default function ReportsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('ALL');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['reports', page, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status && status !== 'ALL') params.set('status', status);
      return listReports(params);
    },
  });

  const generateReport = useMutation({
    mutationFn: async (reportId: string) => {
      await generateReportRequest(reportId);
    },
    onSuccess: () => {
      toast.success('Report generated successfully');
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const approveReport = useMutation({
    mutationFn: async (reportId: string) => {
      await approveReportRequest(reportId);
    },
    onSuccess: () => {
      toast.success('Report approved');
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const dispatchReport = useMutation({
    mutationFn: async (reportId: string) => {
      await dispatchReportRequest(reportId);
    },
    onSuccess: () => {
      toast.success('Report dispatched');
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleDownloadPDF = async (report: Report) => {
    if (!canDownloadReport(report)) {
      toast.error('Download is available after the report is approved.');
      return;
    }

    try {
      const blob = await downloadReportPdf(report.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.reportNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Report downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns: Column<Report>[] = [
    {
      header: 'Report #',
      cell: (row) => (
        <span className="font-mono text-[13px] text-primary/80">{row.reportNumber}</span>
      ),
    },
    {
      header: 'Visit',
      cell: (row) => (
        <span className="font-mono text-[13px] text-muted-foreground">
          {row.visit?.visitNumber || '—'}
        </span>
      ),
    },
    {
      header: 'Patient',
      cell: (row) => {
        if (!row.visit?.patient) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/[0.06] text-[12px] font-semibold text-primary">
              {row.visit.patient.firstName[0]}
              {row.visit.patient.lastName[0]}
            </div>
            <span className="font-medium text-foreground">
              {row.visit.patient.firstName} {row.visit.patient.lastName}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      cell: (row) => (
        <StatusBadge
          status={row.status}
          colorMap={REPORT_STATUS_COLORS}
          labelMap={REPORT_STATUS_LABELS}
        />
      ),
    },
    {
      header: 'Readiness',
      cell: (row) => {
        const workflow = getDiagnosticWorkflow(row.visit?.testOrders ?? []);
        return (
          <div>
            <p className={`text-[13px] font-medium ${workflow.reportReady ? 'text-emerald-600' : 'text-amber-600'}`}>
              {workflow.reportReady ? 'Ready for generation' : workflow.reason}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {workflow.processed}/{workflow.total} samples processed · {workflow.verified}/
              {workflow.total} results verified
            </p>
          </div>
        );
      },
    },
    {
      header: 'Created',
      cell: (row) => (
        <span className="text-[13px] text-muted-foreground">
          {format(new Date(row.createdAt), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => {
        const workflow = getDiagnosticWorkflow(row.visit?.testOrders ?? []);
        const downloadReady = canDownloadReport(row);

        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDownloadPDF(row)}
            disabled={!downloadReady}
            title={downloadReady ? 'Download PDF' : 'Download after approval'}
            className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          {row.status === 'PENDING' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateReport.mutate(row.id)}
              disabled={generateReport.isPending || !workflow.reportReady}
              title={workflow.reportReady ? 'Generate report' : workflow.reason}
              className="h-8 gap-1.5 rounded-lg border-border/50 text-[12px]"
            >
              {generateReport.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FileUp className="h-3 w-3" />
              )}
              Generate
            </Button>
          )}
          {row.status === 'GENERATED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => approveReport.mutate(row.id)}
              disabled={approveReport.isPending}
              className="h-8 gap-1.5 rounded-lg border-emerald-200 bg-emerald-50 text-[12px] text-emerald-700 hover:bg-emerald-100"
            >
              {approveReport.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              Approve
            </Button>
          )}
          {row.status === 'APPROVED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchReport.mutate(row.id)}
              disabled={dispatchReport.isPending}
              className="h-8 gap-1.5 rounded-lg border-violet-200 bg-violet-50 text-[12px] text-violet-700 hover:bg-violet-100"
            >
              {dispatchReport.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Dispatch
            </Button>
          )}
          </div>
        );
      },
    },
  ];

  return (
    <PageTransition>
      <PageHeader title="Reports" description="Manage diagnostic reports and approvals" />

      <FadeIn delay={0.05}>
        <div className="mb-5 flex items-center gap-3">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-52 rounded-lg border-border/50 bg-card text-[13.5px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/dashboard/reports/${row.id}`)}
        emptyMessage="No reports found"
        emptyDescription="Reports will appear here once visits have completed test results."
        pagination={{
          page,
          totalPages: data?.meta?.totalPages ?? 1,
          total: data?.meta?.total,
          onPageChange: setPage,
        }}
      />
    </PageTransition>
  );
}
