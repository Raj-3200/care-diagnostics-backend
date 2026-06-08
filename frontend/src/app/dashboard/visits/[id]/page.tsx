'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { getDiagnosticWorkflow } from '@/lib/workflow';
import type { ApiResponse, Visit, TestOrder, Report } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { WorkflowStepper } from '@/components/shared/workflow-stepper';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  VISIT_STATUS_LABELS,
  VISIT_STATUS_COLORS,
  SAMPLE_STATUS_LABELS,
  SAMPLE_STATUS_COLORS,
  RESULT_STATUS_LABELS,
  RESULT_STATUS_COLORS,
} from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Loader2,
  FileText,
  Receipt,
  CalendarPlus,
  FlaskConical,
  ClipboardList,
  Pipette,
  AlertTriangle,
  StickyNote,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/shared/animations';

const VISIT_STEPS = [
  { label: 'Registered', status: 'REGISTERED' },
  { label: 'Samples Collected', status: 'SAMPLES_COLLECTED' },
  { label: 'In Progress', status: 'IN_PROGRESS' },
  { label: 'Completed', status: 'COMPLETED' },
];

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: visit, isLoading } = useQuery({
    queryKey: ['visit', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Visit>>(`/visits/${id}`);
      return data.data;
    },
  });

  const { data: testOrders } = useQuery({
    queryKey: ['visit-orders', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TestOrder[]>>(`/test-orders/visit/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const collectSample = useMutation({
    mutationFn: async (order: TestOrder) => {
      if (order.sample?.id) {
        if (!user?.id) throw new Error('Current user is not loaded');

        await api.post(`/samples/${order.sample.id}/collect`, {
          collectedById: user.id,
          collectedAt: new Date().toISOString(),
        });
        return;
      }

      await api.post(`/samples/collect`, { testOrderId: order.id });
    },
    onSuccess: () => {
      toast.success('Sample collected');
      qc.invalidateQueries({ queryKey: ['visit-orders', id] });
      qc.invalidateQueries({ queryKey: ['visit', id] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      await api.post('/invoices', { visitId: id });
    },
    onSuccess: () => {
      toast.success('Invoice created');
      qc.invalidateQueries({ queryKey: ['visit', id] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createReport = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<Report>>('/reports', { visitId: id });
      return data.data;
    },
    onSuccess: (report) => {
      toast.success('Report ready');
      qc.invalidateQueries({ queryKey: ['visit', id] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      router.push(`/dashboard/reports/${report.id}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl lg:col-span-2" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!visit) return <p className="py-12 text-center text-muted-foreground">Visit not found.</p>;

  const patient = visit.patient;
  const diagnosticWorkflow = getDiagnosticWorkflow(testOrders ?? []);

  return (
    <PageTransition>
      <PageHeader
        title={`Visit ${visit.visitNumber}`}
        description={patient ? `${patient.firstName} ${patient.lastName} (${patient.mrn})` : ''}
        backHref="/dashboard/visits"
      />

      {/* Workflow Progress Stepper */}
      <FadeIn delay={0.05}>
        <Card className="mb-6 rounded-xl border-border/40 shadow-sm">
          <CardContent className="py-6 px-8">
            <WorkflowStepper steps={VISIT_STEPS} currentStatus={visit.status} />
          </CardContent>
        </Card>
      </FadeIn>

      <StaggerContainer className="grid gap-6 lg:grid-cols-3">
        {/* Visit Info */}
        <StaggerItem>
          <Card className="rounded-xl border-border/40 shadow-sm">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/[0.06]">
                  <ClipboardList className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-[13.5px] font-semibold">Visit Info</h3>
              </div>
              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge
                    status={visit.status}
                    colorMap={VISIT_STATUS_COLORS}
                    labelMap={VISIT_STATUS_LABELS}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visit #</span>
                  <span className="font-mono font-medium">{visit.visitNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {format(new Date(visit.createdAt), 'dd MMM yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{format(new Date(visit.createdAt), 'hh:mm a')}</span>
                </div>
                {visit.notes && (
                  <div className="mt-2 rounded-lg bg-muted/30 p-3">
                    <div className="mb-1 flex items-center gap-1">
                      <StickyNote className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] font-medium text-muted-foreground">Notes</span>
                    </div>
                    <p className="text-[12.5px] text-foreground">{visit.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Actions & Patient */}
        <StaggerItem className="lg:col-span-2">
          <Card className="rounded-xl border-border/40 shadow-sm">
            <CardContent className="pt-6">
              {/* Patient summary row */}
              {patient && (
                <div className="mb-5 flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/[0.08] text-[13px] font-semibold text-primary">
                    {patient.firstName[0]}
                    {patient.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13.5px] font-medium">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      MRN: {patient.mrn} &bull; {patient.phone}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                    className="h-8 rounded-lg text-[12px] text-primary hover:text-primary"
                  >
                    View Profile
                  </Button>
                </div>
              )}

              {/* Action buttons */}
              <div className="mb-2 text-[12px] font-medium text-muted-foreground">
                Quick Actions
              </div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    {diagnosticWorkflow.reportReady
                      ? 'Report prerequisites complete'
                      : diagnosticWorkflow.reason}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {diagnosticWorkflow.processed}/{diagnosticWorkflow.total} samples processed ·{' '}
                    {diagnosticWorkflow.verified}/{diagnosticWorkflow.total} results verified
                  </p>
                </div>
                {!diagnosticWorkflow.reportReady && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(diagnosticWorkflow.nextHref)}
                    className="h-8 gap-1.5 rounded-lg border-border/50 text-[12px]"
                  >
                    {diagnosticWorkflow.nextLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createReport.mutate()}
                  disabled={createReport.isPending || !diagnosticWorkflow.reportReady}
                  title={diagnosticWorkflow.reportReady ? 'Prepare report' : diagnosticWorkflow.reason}
                  className="h-9 gap-1.5 rounded-lg border-border/50 text-[12.5px]"
                >
                  {createReport.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  Prepare Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createInvoice.mutate()}
                  disabled={createInvoice.isPending}
                  className="h-9 gap-1.5 rounded-lg border-border/50 text-[12.5px]"
                >
                  {createInvoice.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Receipt className="h-3.5 w-3.5" />
                  )}
                  Create Invoice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/visits/new?patientId=${visit.patientId}`)}
                  className="h-9 gap-1.5 rounded-lg border-border/50 text-[12.5px]"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  New Visit
                </Button>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Test Orders */}
      <FadeIn delay={0.15}>
        <Card className="mt-6 rounded-xl border-border/40 shadow-sm">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/[0.06]">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-[13.5px] font-semibold">Test Orders</h3>
              {testOrders && testOrders.length > 0 && (
                <>
                  <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {testOrders.length}
                  </span>
                  <div className="ml-auto flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-blue-600">
                      <Pipette className="h-3 w-3" />
                      {diagnosticWorkflow.collected}/{diagnosticWorkflow.total} collected
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      {diagnosticWorkflow.verified}/{diagnosticWorkflow.total} verified
                    </span>
                  </div>
                </>
              )}
            </div>
            {!testOrders || testOrders.length === 0 ? (
              <div className="py-8 text-center">
                <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-[13px] text-muted-foreground">
                  No test orders for this visit.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {testOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-lg border border-border/40 p-4 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[13.5px] font-medium text-foreground">
                          {order.test?.name || 'Test'}
                        </p>
                        <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                          {order.test?.code} &bull; ₹{Number(order.test?.price ?? 0).toFixed(0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.sample && (
                          <StatusBadge
                            status={order.sample.status}
                            colorMap={SAMPLE_STATUS_COLORS}
                            labelMap={SAMPLE_STATUS_LABELS}
                          />
                        )}
                        {order.result && (
                          <StatusBadge
                            status={order.result.status}
                            colorMap={RESULT_STATUS_COLORS}
                            labelMap={RESULT_STATUS_LABELS}
                          />
                        )}
                        {(!order.sample || order.sample.status === 'PENDING_COLLECTION') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => collectSample.mutate(order)}
                            disabled={collectSample.isPending}
                            className="h-8 gap-1.5 rounded-lg border-violet-200 bg-violet-50 text-[12px] text-violet-700 hover:bg-violet-100"
                          >
                            {collectSample.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Pipette className="h-3 w-3" />
                            )}
                            Collect Sample
                          </Button>
                        )}
                      </div>
                    </div>
                    {order.result && order.result.status !== 'PENDING' && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/30 p-3 text-[13px]">
                        <span className="font-medium text-foreground">Result:</span>
                        <span className="text-foreground">
                          {order.result.value} {order.result.unit}
                        </span>
                        {order.result.isAbnormal && (
                          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-destructive">
                            <AlertTriangle className="h-3 w-3" /> Abnormal
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}
