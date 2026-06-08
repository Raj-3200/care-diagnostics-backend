'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '@/lib/api';
import type { ApiResponse, Invoice } from '@/types';
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
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/constants';
import { downloadCsv } from '@/lib/csv';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, CreditCard, Download } from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';
import { FadeIn } from '@/components/shared/animations';

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('ALL');
  const [payDialog, setPayDialog] = useState<{
    open: boolean;
    invoiceId: string;
    dueAmount: number;
  }>({ open: false, invoiceId: '', dueAmount: 0 });
  const [payForm, setPayForm] = useState({ amount: '', paymentMethod: 'CASH' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status && status !== 'ALL') params.set('status', status);
      const { data } = await api.get<ApiResponse<Invoice[]>>(`/invoices?${params}`);
      return data;
    },
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      await api.post(`/invoices/${payDialog.invoiceId}/payment`, {
        amount: parseFloat(payForm.amount),
        paymentMethod: payForm.paymentMethod,
      });
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      setPayDialog({ open: false, invoiceId: '', dueAmount: 0 });
      setPayForm({ amount: '', paymentMethod: 'CASH' });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const columns: Column<Invoice>[] = [
    {
      header: 'Invoice #',
      cell: (row) => (
        <span className="font-mono text-[13px] text-primary/80">{row.invoiceNumber}</span>
      ),
    },
    {
      header: 'Visit',
      cell: (row) => (
        <span className="font-mono text-[13px] text-muted-foreground">
          {row.visit?.visitNumber || '\u2014'}
        </span>
      ),
    },
    {
      header: 'Patient',
      cell: (row) => {
        const patient = row.visit?.patient;
        if (!patient) return <span className="text-muted-foreground">{'\u2014'}</span>;
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/[0.06] text-[11px] font-semibold text-primary">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <span className="text-[13.5px] font-medium">
              {patient.firstName} {patient.lastName}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Net Amount',
      cell: (row) => (
        <span className="font-medium">
          {'\u20B9'}
          {Number(row.netAmount).toFixed(2)}
        </span>
      ),
      className: 'text-right',
    },
    {
      header: 'Paid',
      cell: (row) => (
        <span className="text-emerald-600">
          {'\u20B9'}
          {Number(row.paidAmount).toFixed(2)}
        </span>
      ),
      className: 'text-right',
    },
    {
      header: 'Due',
      cell: (row) => {
        const due = Number(row.dueAmount);
        return (
          <span className={due > 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}>
            {'\u20B9'}
            {due.toFixed(2)}
          </span>
        );
      },
      className: 'text-right',
    },
    {
      header: 'Status',
      cell: (row) => (
        <StatusBadge
          status={row.status}
          colorMap={INVOICE_STATUS_COLORS}
          labelMap={INVOICE_STATUS_LABELS}
        />
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {(row.status === 'PENDING' || row.status === 'PARTIAL') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPayDialog({ open: true, invoiceId: row.id, dueAmount: Number(row.dueAmount) });
                setPayForm({
                  amount: String(Number(row.dueAmount).toFixed(2)),
                  paymentMethod: 'CASH',
                });
              }}
              className="h-8 gap-1.5 rounded-lg border-emerald-200 bg-emerald-50 text-[12px] text-emerald-700 hover:bg-emerald-100"
            >
              <CreditCard className="h-3 w-3" />
              Pay
            </Button>
          )}
        </div>
      ),
    },
  ];

  const exportInvoices = () => {
    const rows = (data?.data ?? []).map((invoice) => ({
      Invoice: invoice.invoiceNumber,
      Visit: invoice.visit?.visitNumber ?? '',
      Patient: invoice.visit?.patient
        ? `${invoice.visit.patient.firstName} ${invoice.visit.patient.lastName}`
        : '',
      NetAmount: Number(invoice.netAmount).toFixed(2),
      Paid: Number(invoice.paidAmount).toFixed(2),
      Due: Number(invoice.dueAmount).toFixed(2),
      Status: INVOICE_STATUS_LABELS[invoice.status],
      Created: format(new Date(invoice.createdAt), 'yyyy-MM-dd'),
    }));
    downloadCsv(`invoices-page-${page}.csv`, rows);
  };

  return (
    <PageTransition>
      <PageHeader title="Invoices" description="Manage billing and payment records">
        <Button
          type="button"
          variant="outline"
          onClick={exportInvoices}
          disabled={(data?.data.length ?? 0) === 0}
          className="h-9 gap-2 rounded-lg border-border/50 text-[13px]"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </PageHeader>

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
              {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => (
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
        emptyMessage="No invoices found"
        emptyDescription="Invoices will be generated automatically when visits are created."
        pagination={{
          page,
          totalPages: data?.meta?.totalPages ?? 1,
          total: data?.meta?.total,
          onPageChange: setPage,
        }}
      />

      <Dialog open={payDialog.open} onOpenChange={(open) => setPayDialog((p) => ({ ...p, open }))}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Record Payment</DialogTitle>
            <p className="text-[13px] text-muted-foreground">
              Due amount:{' '}
              <span className="font-medium text-foreground">
                {'\u20B9'}
                {payDialog.dueAmount.toFixed(2)}
              </span>
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[13px]">Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={payDialog.dueAmount}
                value={payForm.amount}
                onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                className="h-10 rounded-lg border-border/60 text-[14px]"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Payment Method</Label>
              <Select
                value={payForm.paymentMethod}
                onValueChange={(v) => setPayForm((p) => ({ ...p, paymentMethod: v }))}
              >
                <SelectTrigger className="h-10 rounded-lg border-border/60 text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayDialog((p) => ({ ...p, open: false }))}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => recordPayment.mutate()}
              disabled={recordPayment.isPending}
              className="rounded-lg"
            >
              {recordPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
