'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import type { ApiResponse, Report } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/status-badge';
import { REPORT_STATUS_COLORS, REPORT_STATUS_LABELS } from '@/lib/constants';
import { FileSearch, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportLookupPage() {
  const [reportNumber, setReportNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);

    try {
      const { data } = await apiClient.post<ApiResponse<Report>>('/public/report-lookup', {
        reportNumber: reportNumber.trim(),
        phone: phone.trim(),
      });
      setReport(data.data ?? null);
    } catch {
      setError('Report not found or not published.');
    } finally {
      setLoading(false);
    }
  }

  const patient = report?.visit?.patient;
  const testOrders = report?.visit?.testOrders ?? [];

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Report Lookup</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the report number and registered patient phone.
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="reportNumber">Report Number</Label>
                <Input
                  id="reportNumber"
                  value={reportNumber}
                  onChange={(event) => setReportNumber(event.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Patient Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  pattern="[6-9][0-9]{9}"
                  required
                  className="h-10"
                />
              </div>
              <Button type="submit" disabled={loading} className="mt-auto h-10 gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="flex items-center gap-3 p-5 text-sm text-destructive">
              <FileSearch className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {report && (
          <Card className="border-border/50 print:border-none">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col gap-3 border-b border-border/50 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Care Diagnostics</h2>
                  <p className="text-sm text-muted-foreground">Clinical Laboratory Report</p>
                </div>
                <div className="space-y-1 text-sm sm:text-right">
                  <p className="font-mono">{report.reportNumber}</p>
                  <StatusBadge
                    status={report.status}
                    colorMap={REPORT_STATUS_COLORS}
                    labelMap={REPORT_STATUS_LABELS}
                  />
                </div>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Patient" value={patient ? `${patient.firstName} ${patient.lastName}` : '-'} />
                <Info label="MRN" value={patient?.mrn ?? '-'} mono />
                <Info label="Gender" value={patient?.gender ?? '-'} />
                <Info
                  label="DOB"
                  value={patient?.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd MMM yyyy') : '-'}
                />
                <Info label="Visit" value={report.visit?.visitNumber ?? '-'} mono />
                <Info label="Date" value={format(new Date(report.createdAt), 'dd MMM yyyy')} />
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Test</th>
                      <th className="px-3 py-2 text-left font-medium">Result</th>
                      <th className="px-3 py-2 text-left font-medium">Unit</th>
                      <th className="px-3 py-2 text-left font-medium">Range</th>
                      <th className="px-3 py-2 text-left font-medium">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testOrders.map((order) => (
                      <tr key={order.id} className="border-t border-border/40">
                        <td className="px-3 py-2">{order.test?.name ?? '-'}</td>
                        <td className="px-3 py-2 font-medium">{order.result?.value ?? '-'}</td>
                        <td className="px-3 py-2">{order.result?.unit ?? '-'}</td>
                        <td className="px-3 py-2">{order.result?.referenceRange ?? '-'}</td>
                        <td className="px-3 py-2">
                          {order.result?.isAbnormal ? (
                            <span className="text-destructive">Abnormal</span>
                          ) : (
                            <span className="text-emerald-500">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button type="button" onClick={() => window.print()} className="print:hidden">
                Print
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={mono ? 'font-mono' : ''}>{value}</p>
    </div>
  );
}
