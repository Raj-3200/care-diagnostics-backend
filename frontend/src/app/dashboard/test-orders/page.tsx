'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, TestOrder } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';

export default function TestOrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['test-orders', page],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TestOrder[]>>(`/test-orders?page=${page}&limit=20`);
      return data;
    },
  });

  const columns: Column<TestOrder>[] = [
    {
      header: 'Visit #',
      cell: (row) => <span className="font-mono text-[13px] text-primary/80">{row.visit?.visitNumber || '\u2014'}</span>,
    },
    {
      header: 'Patient',
      cell: (row) => {
        const patient = row.visit?.patient;
        if (!patient) return <span className="text-muted-foreground">{'\u2014'}</span>;
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/[0.06] text-[11px] font-semibold text-primary">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <span className="text-[13.5px] font-medium">{patient.firstName} {patient.lastName}</span>
          </div>
        );
      },
    },
    {
      header: 'Test',
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.test?.name || '\u2014'}</p>
          <p className="font-mono text-[12px] text-muted-foreground">{row.test?.code || ''}</p>
        </div>
      ),
    },
    {
      header: 'Priority',
      cell: (row) => (
        <Badge variant={row.priority === 'URGENT' ? 'destructive' : 'secondary'} className="text-[11px]">
          {row.priority}
        </Badge>
      ),
    },
    {
      header: 'Ordered',
      cell: (row) => (
        <span className="text-[13px] text-muted-foreground">
          {format(new Date(row.createdAt), 'dd MMM yyyy, hh:mm a')}
        </span>
      ),
    },
  ];

  const exportOrders = () => {
    const rows = (data?.data ?? []).map((order) => ({
      Visit: order.visit?.visitNumber ?? '',
      Patient: order.visit?.patient
        ? `${order.visit.patient.firstName} ${order.visit.patient.lastName}`
        : '',
      Test: order.test?.name ?? '',
      Code: order.test?.code ?? '',
      Priority: order.priority,
      Ordered: format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm'),
    }));
    downloadCsv(`test-orders-page-${page}.csv`, rows);
  };

  return (
    <PageTransition>
      <PageHeader title="Test Orders" description="View and manage all test orders">
        <Button
          type="button"
          variant="outline"
          onClick={exportOrders}
          disabled={(data?.data.length ?? 0) === 0}
          className="h-9 gap-2 rounded-lg border-border/50 text-[13px]"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </PageHeader>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/dashboard/visits/${row.visitId}`)}
        emptyMessage="No test orders yet"
        emptyDescription="Test orders will appear here when visits are created with diagnostic tests."
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
