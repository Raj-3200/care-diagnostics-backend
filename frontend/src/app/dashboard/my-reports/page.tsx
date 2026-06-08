'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { API_BASE_URL, getErrorMessage } from '@/lib/api';
import type { ApiResponse, ClientReport, Patient } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { FileText, Download, Eye, Loader2, FileSearch, Upload } from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';
import { StaggerContainer, StaggerItem } from '@/components/shared/animations';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export default function MyReportsPage() {
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', patientId: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // Fetch own patients for the patient selector
  const { data: patientsData } = useQuery({
    queryKey: ['my-patients-list'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Patient[]>>('/clients/me/patients?limit=100');
      return data;
    },
  });
  const myPatients = patientsData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['my-reports', page],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ClientReport[]>>(
        `/clients/me/reports?page=${page}&limit=20`,
      );
      return data;
    },
  });

  const reports = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadForm.title);
      if (uploadForm.patientId) {
        formData.append('patientId', uploadForm.patientId);
      }
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }
      await api.post('/clients/me/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Report uploaded successfully');
      setUploadOpen(false);
      setUploadForm({ title: '', description: '', patientId: '' });
      setSelectedFile(null);
      qc.invalidateQueries({ queryKey: ['my-reports'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="My Reports"
        description="View and download your lab reports"
        action={{
          label: 'Upload Report',
          onClick: () => setUploadOpen(true),
          icon: <Upload className="h-4 w-4" />,
        }}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
            <FileSearch className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-foreground">No reports yet</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Your lab reports will appear here once uploaded.
          </p>
        </div>
      ) : (
        <>
          <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <StaggerItem key={report.id}>
                <Card className="group overflow-hidden border-border/40 transition-all hover:border-border/80 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/[0.06]">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[14px] font-semibold text-foreground">
                          {report.title}
                        </h3>
                        {report.patient && (
                          <p className="mt-0.5 text-[12px] font-medium text-primary/80">
                            {report.patient.firstName} {report.patient.lastName} (
                            {report.patient.mrn})
                          </p>
                        )}
                        {report.description && (
                          <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                            {report.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/70">
                          <span>{report.fileName}</span>
                          <span>·</span>
                          <span>{formatFileSize(report.fileSize)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground/60">
                          {format(new Date(report.createdAt), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 gap-1.5 rounded-lg text-[12px]"
                        asChild
                      >
                        <a
                          href={`${API_ORIGIN}${report.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 flex-1 gap-1.5 rounded-lg text-[12px]"
                        asChild
                      >
                        <a
                          href={`${API_ORIGIN}${report.fileUrl}`}
                          download={report.fileName}
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg text-[12px]"
              >
                Previous
              </Button>
              <span className="text-[13px] text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg text-[12px]"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Upload Report Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Upload Report</DialogTitle>
            <p className="text-[13px] text-muted-foreground">
              Upload a lab report to share with your admin.
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
                  {myPatients.map((pt) => (
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
