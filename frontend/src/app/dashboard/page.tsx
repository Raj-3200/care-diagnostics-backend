'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import type { ApiResponse, Visit } from '@/types';
import {
  Users, ClipboardList, TestTube, FileCheck, Receipt, Activity,
  ArrowRight, Clock, UserPlus, FlaskConical, FileOutput,
  Pipette, CheckCircle2, Plus, AlertTriangle, X,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/shared/page-transition';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/shared/animations';
import { StatusBadge } from '@/components/shared/status-badge';
import { VISIT_STATUS_LABELS, VISIT_STATUS_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

interface DashboardStats {
  totalPatients: number;
  todayVisits: number;
  pendingSamples: number;
  pendingResults: number;
  pendingReports: number;
  pendingInvoices: number;
  criticalResults: number;
}

interface PipelineStep {
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  bgColor: string;
  href: string;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [criticalDismissed, setCriticalDismissed] = useState(false);

  useEffect(() => {
    if (user?.role === 'CLIENT') router.replace('/dashboard/my-reports');
  }, [user, router]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [patients, visits, samples, results, reports, invoices, critical, recentVisitsRes] =
          await Promise.allSettled([
            api.get<ApiResponse>('/patients?limit=1'),
            api.get<ApiResponse>('/visits?limit=1'),
            api.get<ApiResponse>('/samples?status=PENDING_COLLECTION&limit=1'),
            api.get<ApiResponse>('/results?status=PENDING&limit=1'),
            api.get<ApiResponse>('/reports?status=PENDING&limit=1'),
            api.get<ApiResponse>('/invoices?status=PENDING&limit=1'),
            api.get<ApiResponse>('/results?isAbnormal=true&limit=1'),
            api.get<ApiResponse<Visit[]>>('/visits?limit=5'),
          ]);

        setStats({
          totalPatients: patients.status === 'fulfilled' ? (patients.value.data.meta?.total ?? 0) : 0,
          todayVisits: visits.status === 'fulfilled' ? (visits.value.data.meta?.total ?? 0) : 0,
          pendingSamples: samples.status === 'fulfilled' ? (samples.value.data.meta?.total ?? 0) : 0,
          pendingResults: results.status === 'fulfilled' ? (results.value.data.meta?.total ?? 0) : 0,
          pendingReports: reports.status === 'fulfilled' ? (reports.value.data.meta?.total ?? 0) : 0,
          pendingInvoices: invoices.status === 'fulfilled' ? (invoices.value.data.meta?.total ?? 0) : 0,
          criticalResults: critical.status === 'fulfilled' ? (critical.value.data.meta?.total ?? 0) : 0,
        });

        if (recentVisitsRes.status === 'fulfilled' && recentVisitsRes.value.data.data) {
          setRecentVisits(recentVisitsRes.value.data.data);
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const statCards = [
    { label: 'Total Patients', value: stats?.totalPatients, icon: Users, color: 'text-blue-400', bgColor: 'bg-blue-500/10', href: '/dashboard/patients' },
    { label: 'Total Visits', value: stats?.todayVisits, icon: ClipboardList, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', href: '/dashboard/visits' },
    { label: 'Pending Samples', value: stats?.pendingSamples, icon: TestTube, color: 'text-amber-400', bgColor: 'bg-amber-500/10', href: '/dashboard/samples', urgent: true },
    { label: 'Pending Results', value: stats?.pendingResults, icon: FileCheck, color: 'text-violet-400', bgColor: 'bg-violet-500/10', href: '/dashboard/results', urgent: true },
    { label: 'Pending Reports', value: stats?.pendingReports, icon: Activity, color: 'text-orange-400', bgColor: 'bg-orange-500/10', href: '/dashboard/reports' },
    { label: 'Pending Invoices', value: stats?.pendingInvoices, icon: Receipt, color: 'text-rose-400', bgColor: 'bg-rose-500/10', href: '/dashboard/invoices' },
  ] as const;

  const pipelineSteps: PipelineStep[] = [
    { label: 'Register', icon: <UserPlus className="h-4 w-4" />, count: stats?.totalPatients ?? 0, color: 'text-blue-400', bgColor: 'bg-blue-500/10', href: '/dashboard/patients/new' },
    { label: 'Visits', icon: <ClipboardList className="h-4 w-4" />, count: stats?.todayVisits ?? 0, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', href: '/dashboard/visits' },
    { label: 'Samples', icon: <Pipette className="h-4 w-4" />, count: stats?.pendingSamples ?? 0, color: 'text-amber-400', bgColor: 'bg-amber-500/10', href: '/dashboard/samples' },
    { label: 'Results', icon: <FlaskConical className="h-4 w-4" />, count: stats?.pendingResults ?? 0, color: 'text-violet-400', bgColor: 'bg-violet-500/10', href: '/dashboard/results' },
    { label: 'Reports', icon: <FileOutput className="h-4 w-4" />, count: stats?.pendingReports ?? 0, color: 'text-orange-400', bgColor: 'bg-orange-500/10', href: '/dashboard/reports' },
    { label: 'Billing', icon: <Receipt className="h-4 w-4" />, count: stats?.pendingInvoices ?? 0, color: 'text-rose-400', bgColor: 'bg-rose-500/10', href: '/dashboard/invoices' },
  ];

  const roleActions: Record<string, { label: string; href: string; icon: React.ComponentType<{ className?: string }>; desc: string }[]> = {
    ADMIN: [
      { label: 'Register Patient', href: '/dashboard/patients/new', icon: UserPlus, desc: 'Add new patient record' },
      { label: 'New Visit', href: '/dashboard/visits/new', icon: ClipboardList, desc: 'Create a patient visit' },
      { label: 'Test Catalog', href: '/dashboard/tests', icon: FlaskConical, desc: 'Browse & manage tests' },
      { label: 'Manage Users', href: '/dashboard/users', icon: Users, desc: 'User administration' },
    ],
    RECEPTIONIST: [
      { label: 'Register Patient', href: '/dashboard/patients/new', icon: UserPlus, desc: 'Add new patient record' },
      { label: 'New Visit', href: '/dashboard/visits/new', icon: ClipboardList, desc: 'Create a patient visit' },
      { label: 'View Invoices', href: '/dashboard/invoices', icon: Receipt, desc: 'Billing & payments' },
      { label: 'View Reports', href: '/dashboard/reports', icon: FileOutput, desc: 'Download reports' },
    ],
    LAB_TECHNICIAN: [
      { label: 'Collect Samples', href: '/dashboard/samples', icon: Pipette, desc: 'Pending sample collection' },
      { label: 'Enter Results', href: '/dashboard/results', icon: FileCheck, desc: 'Record test results' },
      { label: 'View Orders', href: '/dashboard/test-orders', icon: FlaskConical, desc: 'Pending test orders' },
      { label: 'Generate Reports', href: '/dashboard/reports', icon: FileOutput, desc: 'Create lab reports' },
    ],
    PATHOLOGIST: [
      { label: 'Verify Results', href: '/dashboard/results', icon: CheckCircle2, desc: 'Review & approve' },
      { label: 'Approve Reports', href: '/dashboard/reports', icon: FileOutput, desc: 'Sign off on reports' },
      { label: 'View Samples', href: '/dashboard/samples', icon: TestTube, desc: 'Track lab samples' },
      { label: 'Test Orders', href: '/dashboard/test-orders', icon: FlaskConical, desc: 'View test orders' },
    ],
    PATIENT: [
      { label: 'View Reports', href: '/dashboard/reports', icon: FileOutput, desc: 'Your lab reports' },
    ],
    CLIENT: [
      { label: 'My Reports', href: '/dashboard/my-reports', icon: FileOutput, desc: 'Download shared reports' },
      { label: 'My Patients', href: '/dashboard/my-patients', icon: Users, desc: 'Linked patient records' },
      { label: 'Test Requests', href: '/dashboard/test-requests', icon: ClipboardList, desc: 'Request lab tests' },
    ],
  };

  const actions = user?.role ? (roleActions[user.role] ?? []) : [];

  return (
    <PageTransition>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Welcome back, {user?.firstName} 👋
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Here&apos;s an overview of your laboratory operations today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="h-9 gap-1.5 border-border/60">
            <Link href="/dashboard/visits/new"><Plus className="h-3.5 w-3.5" /> New Visit</Link>
          </Button>
          <Button asChild size="sm" className="h-9 gap-1.5">
            <Link href="/dashboard/patients/new"><UserPlus className="h-3.5 w-3.5" /> New Patient</Link>
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {!loading && !criticalDismissed && (stats?.criticalResults ?? 0) > 0 && (
        <FadeIn delay={0.02}>
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/15">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[14px] font-semibold">
                  {stats?.criticalResults} abnormal result
                  {stats?.criticalResults === 1 ? '' : 's'} require review
                </p>
                <p className="mt-0.5 text-[12px] text-destructive/80">
                  Open the filtered results queue before publishing reports.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 border-destructive/30 bg-background/20 text-[12px] text-destructive hover:bg-destructive/10"
              >
                <Link href="/dashboard/results?abnormal=true">Review</Link>
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setCriticalDismissed(true)}
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </FadeIn>
      )}

      <StaggerContainer className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <StaggerItem key={card.label}>
              <Link href={card.href}>
                <Card className="group relative cursor-pointer overflow-hidden border-border/40 py-4 transition-all duration-200 hover:border-border/70 hover:shadow-lg hover:shadow-black/20">
                  <CardContent className="px-4">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${card.bgColor}`}>
                        <Icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                      {'urgent' in card && card.urgent && (card.value ?? 0) > 0 && (
                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                      )}
                    </div>
                    <div className="mt-3">
                      {loading ? (
                        <Skeleton className="mb-1 h-7 w-12" />
                      ) : (
                        <p className="text-2xl font-bold tracking-tight text-foreground">{card.value ?? 0}</p>
                      )}
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground leading-tight">{card.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Quick Actions ── */}
        <FadeIn delay={0.1}>
          <Card className="border-border/40 py-4">
            <CardContent className="px-4">
              <h2 className="mb-3 text-[13px] font-semibold text-foreground">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group flex flex-col gap-1.5 rounded-lg border border-border/40 bg-muted/20 p-3 transition-all hover:border-border/70 hover:bg-muted/40"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <p className="text-[12px] font-medium text-foreground leading-tight">{action.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{action.desc}</p>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* ── Lab Workflow Pipeline ── */}
        <FadeIn delay={0.15} className="lg:col-span-2">
          <Card className="border-border/40 py-4">
            <CardContent className="px-4">
              <div className="mb-3">
                <h2 className="text-[13px] font-semibold text-foreground">Lab Workflow Pipeline</h2>
                <p className="text-[12px] text-muted-foreground">End-to-end view of your diagnostic process</p>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {pipelineSteps.map((step, idx) => (
                  <div key={step.label} className="flex items-center gap-1 flex-shrink-0">
                    <Link
                      href={step.href}
                      className="group flex flex-col items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 p-3 text-center transition-all hover:border-border/70 hover:bg-muted/40 min-w-[80px]"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step.bgColor}`}>
                        <span className={step.color}>{step.icon}</span>
                      </div>
                      <span className={`text-[18px] font-bold ${step.color}`}>{step.count}</span>
                      <span className="text-[11px] text-muted-foreground">{step.label}</span>
                    </Link>
                    {idx < pipelineSteps.length - 1 && (
                      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/30" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* ── Recent Visits ── */}
      {recentVisits.length > 0 && (
        <FadeIn delay={0.2} className="mt-4">
          <Card className="border-border/40 py-4">
            <CardContent className="px-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-foreground">Recent Visits</h2>
                <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-[12px] text-muted-foreground hover:text-foreground">
                  <Link href="/dashboard/visits">View all <ArrowRight className="h-3 w-3" /></Link>
                </Button>
              </div>
              <div className="space-y-1.5">
                {recentVisits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/dashboard/visits/${visit.id}`}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 px-3 py-2.5 transition-all hover:border-border/60 hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {visit.patient?.firstName?.[0]}{visit.patient?.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {visit.patient?.firstName} {visit.patient?.lastName}
                        </p>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {visit.createdAt ? format(new Date(visit.createdAt), 'MMM d, h:mm a') : '—'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      status={visit.status}
                      labelMap={VISIT_STATUS_LABELS as Record<string, string>}
                      colorMap={VISIT_STATUS_COLORS as Record<string, string>}
                    />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* ── Loading skeleton for recent visits ── */}
      {loading && (
        <FadeIn delay={0.2} className="mt-4">
          <Card className="border-border/40 py-4">
            <CardContent className="px-4">
              <Skeleton className="mb-3 h-4 w-32" />
              <div className="space-y-2">
                {[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </PageTransition>
  );
}
