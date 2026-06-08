'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/api';
import type { Result } from '@/types';
import {
  enterResult as enterResultRequest,
  listResults,
  verifyResult as verifyResultRequest,
} from '@/services/results';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RESULT_STATUS_LABELS, RESULT_STATUS_COLORS } from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, PenLine, CheckCircle, AlertTriangle } from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';
import { FadeIn } from '@/components/shared/animations';

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('ALL');
  const abnormalOnly = searchParams.get('abnormal') === 'true';
  const [entryDialog, setEntryDialog] = useState<{
    open: boolean;
    resultId: string;
    testName: string;
  }>({ open: false, resultId: '', testName: '' });
  const [resultForm, setResultForm] = useState({
    value: '',
    unit: '',
    referenceRange: '',
    isAbnormal: false,
    remarks: '',
  });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['results', page, status, abnormalOnly],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status && status !== 'ALL') params.set('status', status);
      if (abnormalOnly) params.set('isAbnormal', 'true');
      return listResults(params);
    },
  });

  const enterResult = useMutation({
    mutationFn: async () => {
      await enterResultRequest(entryDialog.resultId, resultForm);
    },
    onSuccess: () => {
      toast.success('Result entered successfully');
      setEntryDialog({ open: false, resultId: '', testName: '' });
      setResultForm({ value: '', unit: '', referenceRange: '', isAbnormal: false, remarks: '' });
      qc.invalidateQueries({ queryKey: ['results'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const verifyResult = useMutation({
    mutationFn: async (resultId: string) => {
      await verifyResultRequest(resultId);
    },
    onSuccess: () => {
      toast.success('Result verified');
      qc.invalidateQueries({ queryKey: ['results'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openEntryDialog = (result: Result) => {
    setEntryDialog({
      open: true,
      resultId: result.id,
      testName: result.testOrder?.test?.name || 'Test',
    });
    setResultForm({
      value: '',
      unit: result.testOrder?.test?.sampleType === 'BLOOD' ? 'mg/dL' : '',
      referenceRange: '',
      isAbnormal: false,
      remarks: '',
    });
  };

  const columns: Column<Result>[] = [
    {
      header: 'Test',
      cell: (row) => (
        <span className="font-medium text-foreground">{row.testOrder?.test?.name || '\u2014'}</span>
      ),
    },
    {
      header: 'Patient',
      cell: (row) => {
        const patient = row.testOrder?.visit?.patient;
        if (!patient) return <span className="text-muted-foreground">{'\u2014'}</span>;
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/[0.06] text-[11px] font-semibold text-primary">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <span className="text-[13px]">
              {patient.firstName} {patient.lastName}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Value',
      cell: (row) => {
        if (!row.value) return <span className="text-muted-foreground">{'\u2014'}</span>;
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-medium">
              {row.value} {row.unit || ''}
            </span>
            {row.isAbnormal && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          </div>
        );
      },
    },
    {
      header: 'Reference',
      cell: (row) => (
        <span className="text-[13px] text-muted-foreground">{row.referenceRange || '\u2014'}</span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <StatusBadge
          status={row.status}
          colorMap={RESULT_STATUS_COLORS}
          labelMap={RESULT_STATUS_LABELS}
        />
      ),
    },
    {
      header: 'Entered',
      cell: (row) => (
        <span className="text-[13px] text-muted-foreground">
          {row.enteredAt ? format(new Date(row.enteredAt), 'dd MMM, hh:mm a') : '\u2014'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {row.status === 'PENDING' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEntryDialog(row)}
              className="h-8 gap-1.5 rounded-lg border-border/50 text-[12px]"
            >
              <PenLine className="h-3 w-3" />
              Enter Result
            </Button>
          )}
          {row.status === 'ENTERED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => verifyResult.mutate(row.id)}
              disabled={verifyResult.isPending}
              className="h-8 gap-1.5 rounded-lg border-emerald-200 bg-emerald-50 text-[12px] text-emerald-700 hover:bg-emerald-100"
            >
              {verifyResult.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              Verify
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <PageHeader
        title={abnormalOnly ? 'Abnormal Results' : 'Results'}
        description="Enter and verify diagnostic test results"
      />

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
              {Object.entries(RESULT_STATUS_LABELS).map(([k, v]) => (
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
        emptyMessage="No results found"
        emptyDescription="Results will appear here once samples are processed."
        pagination={{
          page,
          totalPages: data?.meta?.totalPages ?? 1,
          total: data?.meta?.total,
          onPageChange: setPage,
        }}
      />

      <Dialog
        open={entryDialog.open}
        onOpenChange={(open) =>
          setEntryDialog({ open, resultId: entryDialog.resultId, testName: entryDialog.testName })
        }
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Enter Result</DialogTitle>
            <p className="text-[13px] text-muted-foreground">{entryDialog.testName}</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[13px]">Value *</Label>
                <Input
                  value={resultForm.value}
                  onChange={(e) => setResultForm((p) => ({ ...p, value: e.target.value }))}
                  placeholder="e.g. 120"
                  className="h-10 rounded-lg border-border/60 text-[14px]"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Unit</Label>
                <Input
                  value={resultForm.unit}
                  onChange={(e) => setResultForm((p) => ({ ...p, unit: e.target.value }))}
                  placeholder="e.g. mg/dL"
                  className="h-10 rounded-lg border-border/60 text-[14px]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Reference Range</Label>
              <Input
                value={resultForm.referenceRange}
                onChange={(e) => setResultForm((p) => ({ ...p, referenceRange: e.target.value }))}
                placeholder="e.g. 70\u2013110"
                className="h-10 rounded-lg border-border/60 text-[14px]"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <Checkbox
                checked={resultForm.isAbnormal}
                onCheckedChange={(c) => setResultForm((p) => ({ ...p, isAbnormal: !!c }))}
              />
              <Label className="text-[13px] text-muted-foreground">Mark as abnormal</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Remarks</Label>
              <Textarea
                value={resultForm.remarks}
                onChange={(e) => setResultForm((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="Optional clinical notes..."
                className="min-h-[80px] rounded-lg border-border/60 text-[14px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEntryDialog({ open: false, resultId: '', testName: '' })}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => enterResult.mutate()}
              disabled={resultForm.value === '' || enterResult.isPending}
              className="rounded-lg"
            >
              {enterResult.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
