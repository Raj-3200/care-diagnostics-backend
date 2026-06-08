'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ApiResponse, Sample } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SAMPLE_STATUS_LABELS, SAMPLE_STATUS_COLORS, SAMPLE_TYPE_LABELS } from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, FlaskRound, Microscope, Pipette } from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';
import { FadeIn } from '@/components/shared/animations';

export default function SamplesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('ALL');
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['samples', page, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status && status !== 'ALL') params.set('status', status);
      const { data } = await api.get<ApiResponse<Sample[]>>(`/samples?${params}`);
      return data;
    },
  });

  const collectPendingSample = useMutation({
    mutationFn: async (sampleId: string) => {
      if (!user?.id) throw new Error('Current user is not loaded');

      await api.post(`/samples/${sampleId}/collect`, {
        collectedById: user.id,
        collectedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Sample collected');
      qc.invalidateQueries({ queryKey: ['samples'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const receiveInLab = useMutation({
    mutationFn: async (sampleId: string) => {
      await api.patch(`/samples/${sampleId}/receive`);
    },
    onSuccess: () => {
      toast.success('Sample received in lab');
      qc.invalidateQueries({ queryKey: ['samples'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const processSample = useMutation({
    mutationFn: async (sampleId: string) => {
      await api.patch(`/samples/${sampleId}/process`);
    },
    onSuccess: () => {
      toast.success('Sample marked as processed');
      qc.invalidateQueries({ queryKey: ['samples'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const columns: Column<Sample>[] = [
    {
      header: 'Barcode',
      cell: (row) => <span className="font-mono text-[13px] text-primary/80">{row.barcode}</span>,
    },
    {
      header: 'Sample Type',
      cell: (row) => (
        <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[12px] font-medium text-muted-foreground">
          {SAMPLE_TYPE_LABELS[row.sampleType]}
        </span>
      ),
    },
    {
      header: 'Test',
      cell: (row) => (
        <span className="text-foreground">{row.testOrder?.test?.name || '\u2014'}</span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <StatusBadge status={row.status} colorMap={SAMPLE_STATUS_COLORS} labelMap={SAMPLE_STATUS_LABELS} />
      ),
    },
    {
      header: 'Collected',
      cell: (row) => (
        <span className="text-[13px] text-muted-foreground">
          {row.collectedAt ? format(new Date(row.collectedAt), 'dd MMM, hh:mm a') : '\u2014'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {row.status === 'PENDING_COLLECTION' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => collectPendingSample.mutate(row.id)}
              disabled={collectPendingSample.isPending}
              className="h-8 gap-1.5 rounded-lg border-violet-200 bg-violet-50 text-[12px] text-violet-700 hover:bg-violet-100"
            >
              {collectPendingSample.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pipette className="h-3 w-3" />}
              Collect
            </Button>
          )}
          {row.status === 'COLLECTED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => receiveInLab.mutate(row.id)}
              disabled={receiveInLab.isPending}
              className="h-8 gap-1.5 rounded-lg border-border/50 text-[12px]"
            >
              {receiveInLab.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskRound className="h-3 w-3" />}
              Receive
            </Button>
          )}
          {row.status === 'IN_LAB' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => processSample.mutate(row.id)}
              disabled={processSample.isPending}
              className="h-8 gap-1.5 rounded-lg border-emerald-200 bg-emerald-50 text-[12px] text-emerald-700 hover:bg-emerald-100"
            >
              {processSample.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Microscope className="h-3 w-3" />}
              Process
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <PageHeader title="Samples" description="Track sample collection and processing" />

      <FadeIn delay={0.05}>
        <div className="mb-5 flex items-center gap-3">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-52 rounded-lg border-border/50 bg-card text-[13.5px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.entries(SAMPLE_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No samples found"
        emptyDescription="Sample tasks appear here after tests are ordered for visits."
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
