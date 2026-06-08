'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { API_BASE_URL, getErrorMessage } from '@/lib/api';
import type { ApiResponse, User, Patient, ClientReport, Visit } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Loader2,
  Upload,
  FileText,
  Trash2,
  Eye,
  Users,
  Mail,
  Phone,
  Calendar,
  Download,
  ClipboardList,
} from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';
import { FadeIn } from '@/components/shared/animations';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [patientPage, setPatientPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', patientId: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch client details
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User>>(`/clients/${id}`);
      return data;
    },
  });

  // Fetch client patients
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ['client-patients', id, patientPage],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Patient[]>>(
        `/clients/${id}/patients?page=${patientPage}&limit=20`,
      );
      return data;
    },
  });

  // Fetch client reports
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['client-reports', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ClientReport[]>>(`/clients/${id}/reports`);
      return data;
    },
  });

  // Fetch visits for this client's patients
  const { data: visitsData, isLoading: visitsLoading } = useQuery({
    queryKey: ['client-visits', id],
    queryFn: async () => {
      // Get all visits, filter by patient IDs from this client
      const { data } = await api.get<ApiResponse<Visit[]>>('/visits?limit=50');
      return data;
    },
    enabled: !!patientsData,
  });

  const client = clientData?.data;
  const patients = patientsData?.data ?? [];
  const reports = reportsData?.data ?? [];
  const patientIds = new Set(patients.map((p) => p.id));
  const clientVisits = (visitsData?.data ?? []).filter(
    (v) => v.patient && patientIds.has(v.patientId),
  );

  // Upload report
  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('clientId', id);
      formData.append('title', uploadForm.title);
      if (uploadForm.patientId) {
        formData.append('patientId', uploadForm.patientId);
      }
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }
      await api.post('/clients/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Report uploaded successfully');
      setUploadOpen(false);
      setUploadForm({ title: '', description: '', patientId: '' });
      setSelectedFile(null);
      qc.invalidateQueries({ queryKey: ['client-reports', id] });
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
      qc.invalidateQueries({ queryKey: ['client-reports', id] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const patientColumns: Column<Patient>[] = [
    {
      header: 'Patient',
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
            <p className="text-[12px] text-muted-foreground">{row.mrn}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Gender',
      cell: (row) => <span className="text-[13px] text-muted-foreground">{row.gender}</span>,
    },
    {
      header: 'Phone',
      cell: (row) => <span className="text-[13px] text-muted-foreground">{row.phone}</span>,
    },
    {
      header: 'DOB',
      cell: (row) => (
        <span className="text-[13px] text-muted-foreground">
          {format(new Date(row.dateOfBirth), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      header: 'Registered',
      cell: (row) => (
        <span className="text-[13px] text-muted-foreground">
          {format(new Date(row.createdAt), 'dd MMM yyyy')}
        </span>
      ),
    },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-[15px] font-medium text-foreground">Client not found</p>
          <Button
            variant="outline"
            className="mt-4 rounded-lg"
            onClick={() => router.push('/dashboard/clients')}
          >
            Back to Clients
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title={`${client.firstName} ${client.lastName}`}
        description="Client overview — patients and reports"
        backHref="/dashboard/clients"
        action={{
          label: 'Upload Report',
          onClick: () => setUploadOpen(true),
          icon: <Upload className="h-4 w-4" />,
        }}
      />

      {/* Client Info Card */}
      <FadeIn delay={0.05}>
        <Card className="mb-6 border-border/40">
          <CardContent className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.06]">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground/60">
                    Email
                  </p>
                  <p className="text-[13px] text-foreground">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.06]">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground/60">
                    Phone
                  </p>
                  <p className="text-[13px] text-foreground">{client.phone || '\u2014'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.06]">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground/60">
                    Patients
                  </p>
                  <p className="text-[13px] text-foreground">{patientsData?.meta?.total ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.06]">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground/60">
                    Joined
                  </p>
                  <p className="text-[13px] text-foreground">
                    {format(new Date(client.createdAt), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Tabs: Patients / Requests / Reports */}
      <Tabs defaultValue="patients">
        <TabsList className="mb-4">
          <TabsTrigger value="patients" className="gap-1.5 text-[13px]">
            <Users className="h-3.5 w-3.5" />
            Patients ({patientsData?.meta?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5 text-[13px]">
            <ClipboardList className="h-3.5 w-3.5" />
            Requests ({clientVisits.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-[13px]">
            <FileText className="h-3.5 w-3.5" />
            Reports ({reports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patients">
          <DataTable
            columns={patientColumns}
            data={patients}
            isLoading={patientsLoading}
            emptyMessage="No patients from this client"
            emptyDescription="Patients referred by this client will appear here."
            pagination={{
              page: patientPage,
              totalPages: patientsData?.meta?.totalPages ?? 1,
              total: patientsData?.meta?.total,
              onPageChange: setPatientPage,
            }}
          />
        </TabsContent>

        <TabsContent value="requests">
          {visitsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : clientVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                <ClipboardList className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="mt-3 text-[14px] font-medium text-foreground/70">No requests yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Test requests submitted by this client will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientVisits.map((visit) => (
                <FadeIn key={visit.id}>
                  <div className="rounded-xl border border-border/40 bg-card p-4 transition-colors hover:border-border/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-medium text-foreground">
                          {visit.patient?.firstName} {visit.patient?.lastName}
                          <span className="ml-2 text-[12px] text-muted-foreground">
                            {visit.visitNumber}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {format(new Date(visit.createdAt), 'dd MMM yyyy, hh:mm a')}
                          {visit.testOrders && ` · ${visit.testOrders.length} test(s)`}
                        </p>
                      </div>
                      <Badge
                        className={`text-[11px] ${
                          visit.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : visit.status === 'IN_PROGRESS'
                              ? 'bg-purple-100 text-purple-800'
                              : visit.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {visit.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {visit.testOrders && visit.testOrders.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {visit.testOrders.map((to) => (
                          <span
                            key={to.id}
                            className="rounded-md bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {to.test?.name || to.testId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports">
          {reportsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                <FileText className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="mt-3 text-[14px] font-medium text-foreground/70">No reports yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Upload a report for this client to get started.
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-lg"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Report
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report: ClientReport) => (
                <FadeIn key={report.id}>
                  <div className="flex items-center justify-between rounded-xl border border-border/40 bg-card p-4 transition-colors hover:border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/[0.06]">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-foreground">{report.title}</p>
                        {report.patient && (
                          <p className="mt-0.5 text-[12px] font-medium text-primary/80">
                            {report.patient.firstName} {report.patient.lastName} (
                            {report.patient.mrn})
                          </p>
                        )}
                        {report.description && (
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            {report.description}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground/60">
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
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                        <a
                          href={`${API_ORIGIN}${report.fileUrl}`}
                          download={report.fileName}
                        >
                          <Download className="h-3.5 w-3.5" />
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
                </FadeIn>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Report Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Upload Report</DialogTitle>
            <p className="text-[13px] text-muted-foreground">
              Upload a lab report for{' '}
              <span className="font-medium text-foreground">
                {client.firstName} {client.lastName}
              </span>
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[13px]">Patient *</Label>
              <Select
                value={uploadForm.patientId}
                onValueChange={(v) => setUploadForm((p) => ({ ...p, patientId: v }))}
              >
                <SelectTrigger className="h-10 rounded-lg border-border/60 text-[14px]">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.firstName} {pt.lastName} ({pt.mrn})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              disabled={loading || !selectedFile || !uploadForm.title || !uploadForm.patientId}
              className="rounded-lg"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
