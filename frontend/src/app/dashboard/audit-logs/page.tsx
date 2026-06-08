'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RotateCcw, Search, Shield } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { PageTransition } from '@/components/shared/page-transition';
import { FadeIn } from '@/components/shared/animations';
import { DataTable, Column } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listAuditLogs } from '@/services/audit-logs';
import type { AuditLog } from '@/types';

function formatAuditValue(value: unknown) {
  if (!value) return 'None';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return 'Changed';
  }
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    entity: '',
    dateFrom: '',
    dateTo: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    return params;
  }, [appliedFilters, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, appliedFilters],
    queryFn: () => listAuditLogs(queryParams),
  });

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    const emptyFilters = { action: '', entity: '', dateFrom: '', dateTo: '' };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const columns: Column<AuditLog>[] = [
    {
      header: 'When',
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground">
            {format(new Date(row.createdAt), 'dd MMM yyyy')}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {format(new Date(row.createdAt), 'hh:mm a')}
          </p>
        </div>
      ),
    },
    {
      header: 'Actor',
      cell: (row) => {
        if (!row.user) return <span className="text-muted-foreground">System</span>;
        return (
          <div>
            <p className="font-medium text-foreground">
              {row.user.firstName} {row.user.lastName}
            </p>
            <p className="text-[12px] text-muted-foreground">{row.user.email}</p>
          </div>
        );
      },
    },
    {
      header: 'Action',
      cell: (row) => (
        <span className="inline-flex rounded-md bg-primary/[0.07] px-2 py-1 font-mono text-[12px] text-primary">
          {row.action}
        </span>
      ),
    },
    {
      header: 'Record',
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.entity}</p>
          <p className="max-w-[220px] truncate font-mono text-[12px] text-muted-foreground">
            {row.entityId}
          </p>
        </div>
      ),
    },
    {
      header: 'Change',
      cell: (row) => (
        <p className="max-w-[280px] truncate text-[13px] text-muted-foreground">
          {formatAuditValue(row.newValue ?? row.oldValue)}
        </p>
      ),
    },
    {
      header: 'Source',
      cell: (row) => (
        <div>
          <p className="font-mono text-[12px] text-muted-foreground">{row.ipAddress || 'N/A'}</p>
          <p className="max-w-[180px] truncate text-[12px] text-muted-foreground">
            {row.userAgent || 'N/A'}
          </p>
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Audit Logs"
        description="Review user activity and record changes"
        action={{ label: 'Refresh', onClick: () => setAppliedFilters({ ...appliedFilters }), icon: <Shield className="h-4 w-4" /> }}
      />

      <FadeIn delay={0.05}>
        <div className="mb-5 grid gap-3 rounded-xl border border-border/50 bg-card p-3 md:grid-cols-[1fr_1fr_160px_160px_auto_auto]">
          <Input
            value={filters.action}
            onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
            placeholder="Action"
            className="h-10 rounded-lg border-border/60 text-[13.5px]"
          />
          <Input
            value={filters.entity}
            onChange={(event) => setFilters((current) => ({ ...current, entity: event.target.value }))}
            placeholder="Entity"
            className="h-10 rounded-lg border-border/60 text-[13.5px]"
          />
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
            className="h-10 rounded-lg border-border/60 text-[13.5px]"
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
            className="h-10 rounded-lg border-border/60 text-[13.5px]"
          />
          <Button onClick={applyFilters} className="h-10 gap-2 rounded-lg px-4 text-[13px]">
            <Search className="h-4 w-4" />
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            className="h-10 gap-2 rounded-lg px-4 text-[13px]"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </FadeIn>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No audit logs found"
        emptyDescription="Activity that matches the current filters will appear here."
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
