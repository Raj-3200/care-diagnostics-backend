'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { NAV_ITEMS } from '@/lib/constants';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FlaskConical,
  FileText,
  TestTube,
  FileCheck,
  FileOutput,
  Receipt,
  Shield,
  Activity,
  Building,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  ClipboardList,
  FlaskConical,
  FileText,
  TestTube,
  FileCheck,
  FileOutput,
  Receipt,
  Shield,
  Building,
};

const NAV_SECTIONS = [
  { label: 'Overview', items: ['Dashboard'] },
  { label: 'Patient Care', items: ['Patients', 'Visits'] },
  { label: 'Laboratory', items: ['Test Catalog', 'Test Orders', 'Samples', 'Results'] },
  { label: 'Reporting', items: ['Reports', 'Invoices'] },
  { label: 'Administration', items: ['Users', 'Clients', 'Audit Logs', 'Lab Settings', 'Billing'] },
  { label: 'Client Portal', items: ['My Reports', 'My Patients', 'Test Requests'] },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const filteredItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Care Diagnostics</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV_SECTIONS.map((section) => {
          const sectionItems = filteredItems.filter((item) => section.items.includes(item.label));
          if (sectionItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-5">
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {sectionItems.map((item) => {
                  const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all duration-150',
                        isActive
                          ? 'bg-primary/[0.08] text-primary'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] flex-shrink-0',
                          isActive ? 'text-primary' : 'text-muted-foreground/70',
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
