'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { API_BASE_URL, getErrorMessage } from '@/lib/api';
import type { ApiResponse, User, ClientReport } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
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
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Loader2,
  Building,
  ShieldCheck,
  ShieldOff,
  Upload,
  FileText,
  Trash2,
  Eye,
} from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';
import { useRouter } from 'next/navigation';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export default function ClientsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [uploadForm, setUploadForm] = useState({ title: '', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // Fetch clients
  const { data, isLoading } = useQuery({
    queryKey: ['clients', page],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User[]>>(`/clients?page=${page}&limit=20`);
      return data;
    },
  });

  // Fetch reports for selected client
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['client-reports', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return null;
      const { data } = await api.get<ApiResponse<ClientReport[]>>(
        `/clients/${selectedClient.id}/reports`,
      );
      return data;
    },
    enabled: !!selectedClient && reportsOpen,
  });

  // Toggle active
  const toggleActive = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      await api.patch(`/clients/${userId}`, { isActive: !isActive });
    },
    onSuccess: () => {
      toast.success('Client updated');
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // Create client
  const handleCreate = async () => {
    setLoading(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v));
      await api.post('/clients', payload);
      toast.success('Client created successfully');
      setCreateOpen(false);
      setForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
      });
      qc.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Upload report
  const handleUpload = async () => {
    if (!selectedClient || !selectedFile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('clientId', selectedClient.id);
      formData.append('title', uploadForm.title);
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }

      await api.post('/clients/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Report uploaded successfully');
      setUploadOpen(false);
      setUploadForm({ title: '', description: '' });
      setSelectedFile(null);
      qc.invalidateQueries({ queryKey: ['client-reports', selectedClient.id] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Delete report
  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      await api.delete(`/clients/reports/${reportId}`);
    },
    onSuccess: () => {
      toast.success('Report deleted');
      qc.invalidateQueries({ queryKey: ['client-reports'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const columns: Column<User>[] = [
    {
      header: 'Client',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/[0.06] text-[12px] font-semibold text-primary">
            {row.firstName[0]}
            {row.lastName[0]}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-[12px] text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone',
      cell: (row) => <span className="text-muted-foreground">{row.phone || '\u2014'}</span>,
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.isActive ? 'default' : 'secondary'} className="text-[11px]">
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
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
      cell: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 rounded-lg text-[12px]"
            onClick={() => {
              setSelectedClient(row);
              setReportsOpen(true);
            }}
          >
            <Eye className="h-3 w-3" />
            Reports
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 rounded-lg text-[12px] border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => {
              setSelectedClient(row);
              setUploadOpen(true);
            }}
          >
            <Upload className="h-3 w-3" />
            Upload
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleActive.mutate({ userId: row.id, isActive: row.isActive })}
            disabled={toggleActive.isPending}
            className={`h-8 gap-1.5 rounded-lg text-[12px] ${
              row.isActive
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            {row.isActive ? <ShieldOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <PageTransition>
      <PageHeader
        title="Clients"
        description="Manage client accounts and upload lab reports"
        action={{
          label: 'New Client',
          onClick: () => setCreateOpen(true),
          icon: <Building className="h-4 w-4" />,
        }}
      />
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No clients found"
        emptyDescription="Create client accounts to share lab reports with them."
        onRowClick={(row) => router.push(`/dashboard/clients/${row.id}`)}
        pagination={{
          page,
          totalPages: data?.meta?.totalPages ?? 1,
          total: data?.meta?.total,
          onPageChange: setPage,
        }}
      />

      {/* Create Client Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Create Client</DialogTitle>
            <p className="text-[13px] text-muted-foreground">
              Add a new client who can access their lab reports.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px]">First Name *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  className="h-10 rounded-lg border-border/60 text-[14px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Last Name *</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  className="h-10 rounded-lg border-border/60 text-[14px]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="h-10 rounded-lg border-border/60 text-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="h-10 rounded-lg border-border/60 text-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="h-10 rounded-lg border-border/60 text-[14px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading} className="rounded-lg">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Report Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Upload Report</DialogTitle>
            <p className="text-[13px] text-muted-foreground">
              Upload a lab report for{' '}
              <span className="font-medium text-foreground">
                {selectedClient?.firstName} {selectedClient?.lastName}
              </span>
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[13px]">Report Title *</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Blood Test Report - March 2026"
                className="h-10 rounded-lg border-border/60 text-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional notes about this report"
                className="min-h-[80px] rounded-lg border-border/60 text-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">File *</Label>
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 p-6 transition-colors hover:border-primary/40 hover:bg-muted/20"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary/60" />
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-[13px] text-muted-foreground">Click to select a file</p>
                    <p className="text-[11px] text-muted-foreground/60">
                      PDF, JPG, PNG, DOC, DOCX (max 20MB)
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={loading || !selectedFile || !uploadForm.title}
              className="rounded-lg"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Client Reports Dialog */}
      <Dialog open={reportsOpen} onOpenChange={setReportsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Reports — {selectedClient?.firstName} {selectedClient?.lastName}
            </DialogTitle>
            <p className="text-[13px] text-muted-foreground">
              Lab reports uploaded for this client.
            </p>
          </DialogHeader>
          <div className="max-h-[400px] space-y-3 overflow-y-auto py-2">
            {reportsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (reportsData?.data ?? []).length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">No reports uploaded yet</p>
              </div>
            ) : (
              (reportsData?.data ?? []).map((report: ClientReport) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.06]">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{report.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {report.fileName} · {formatFileSize(report.fileSize)} ·{' '}
                        {format(new Date(report.createdAt), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                      <a
                        href={`${API_ORIGIN}${report.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteReport.mutate(report.id)}
                      disabled={deleteReport.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReportsOpen(false);
                setUploadOpen(true);
              }}
              className="rounded-lg"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload New Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
