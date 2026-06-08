'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { PageTransition } from '@/components/shared/page-transition';
import { FadeIn } from '@/components/shared/animations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api';
import {
  getLabSettings,
  updateLabSettings,
  type LabSettingsPayload,
} from '@/services/settings';

const emptyForm = {
  name: '',
  logoUrl: '',
  address: '',
  phone: '',
  email: '',
  reportPrefix: 'CD-RPT',
  invoicePrefix: 'CD-INV',
};

export default function LabSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['lab-settings'],
    queryFn: getLabSettings,
  });

  useEffect(() => {
    const lab = data?.data;
    if (!lab) return;
    setForm({
      name: lab.name,
      logoUrl: lab.logoUrl ?? '',
      address: lab.address ?? '',
      phone: lab.phone ?? '',
      email: lab.email ?? '',
      reportPrefix: lab.settings?.reportPrefix ?? 'CD-RPT',
      invoicePrefix: lab.settings?.invoicePrefix ?? 'CD-INV',
    });
  }, [data]);

  const saveSettings = useMutation({
    mutationFn: (payload: LabSettingsPayload) => updateLabSettings(payload),
    onSuccess: () => {
      toast.success('Lab settings saved');
      queryClient.invalidateQueries({ queryKey: ['lab-settings'] });
      queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Lab Settings"
        description="Manage branding and document prefixes"
        action={{
          label: saveSettings.isPending ? 'Saving' : 'Save',
          onClick: () => saveSettings.mutate(form),
          icon: <Save className="h-4 w-4" />,
        }}
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : (
        <FadeIn delay={0.05}>
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <form
              className="space-y-5 rounded-xl border border-border/50 bg-card p-5"
              onSubmit={(event) => {
                event.preventDefault();
                saveSettings.mutate(form);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-[13px]">Lab Name</Label>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="h-10 rounded-lg border-border/60 text-[14px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px]">Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="h-10 rounded-lg border-border/60 text-[14px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px]">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="h-10 rounded-lg border-border/60 text-[14px]"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-[13px]">Logo URL</Label>
                  <Input
                    value={form.logoUrl}
                    onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
                    className="h-10 rounded-lg border-border/60 text-[14px]"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-[13px]">Address</Label>
                  <Textarea
                    value={form.address}
                    onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                    className="min-h-24 rounded-lg border-border/60 text-[14px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px]">Report Prefix</Label>
                  <Input
                    value={form.reportPrefix}
                    onChange={(event) => setForm((current) => ({ ...current, reportPrefix: event.target.value }))}
                    className="h-10 rounded-lg border-border/60 font-mono text-[14px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px]">Invoice Prefix</Label>
                  <Input
                    value={form.invoicePrefix}
                    onChange={(event) => setForm((current) => ({ ...current, invoicePrefix: event.target.value }))}
                    className="h-10 rounded-lg border-border/60 font-mono text-[14px]"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saveSettings.isPending} className="h-9 gap-2 rounded-lg">
                  <Save className="h-4 w-4" />
                  {saveSettings.isPending ? 'Saving' : 'Save Settings'}
                </Button>
              </div>
            </form>

            <div className="rounded-xl border border-border/50 bg-card p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Preview
              </p>
              <div className="mt-4 rounded-lg border border-border/50 bg-background p-4">
                <p className="text-lg font-semibold text-foreground">{form.name || 'Lab Name'}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{form.address || 'Address'}</p>
                <div className="mt-4 space-y-1 text-[12px] text-muted-foreground">
                  <p>{form.phone || 'Phone'}</p>
                  <p>{form.email || 'Email'}</p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-muted-foreground">Reports</p>
                    <p className="font-mono font-medium text-foreground">{form.reportPrefix}-0001</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-muted-foreground">Invoices</p>
                    <p className="font-mono font-medium text-foreground">{form.invoicePrefix}-0001</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      )}
    </PageTransition>
  );
}
