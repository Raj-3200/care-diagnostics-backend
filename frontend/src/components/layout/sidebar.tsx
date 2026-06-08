'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { NAV_ITEMS } from '@/lib/constants';
import api from '@/lib/api';
import type { ApiResponse } from '@/types';
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
import { motion } from 'framer-motion';

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

// Group nav items into sections for visual clarity
const NAV_SECTIONS = [
  { label: 'Overview', items: ['Dashboard'] },
  { label: 'Patient Care', items: ['Patients', 'Visits'] },
  { label: 'Laboratory', items: ['Test Catalog', 'Test Orders', 'Samples', 'Results'] },
  { label: 'Reporting', items: ['Reports', 'Invoices'] },
  { label: 'Administration', items: ['Users', 'Clients', 'Audit Logs', 'Lab Settings', 'Billing'] },
  { label: 'Client Portal', items: ['My Reports', 'My Patients', 'Test Requests'] },
];

// Map nav labels to badge-count endpoints
const BADGE_ENDPOINTS: Record<string, string> = {
  Samples: '/samples?status=PENDING_COLLECTION&limit=1',
  Results: '/results?status=PENDING&limit=1',
  Reports: '/reports?status=PENDING&limit=1',
  Invoices: '/invoices?status=PENDING&limit=1',
};

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadBadges() {
      const entries = Object.entries(BADGE_ENDPOINTS);
      const results = await Promise.allSettled(entries.map(([, url]) => api.get<ApiResponse>(url)));
      const newBadges: Record<string, number> = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const count = r.value.data.meta?.total ?? 0;
          if (count > 0) newBadges[entries[i][0]] = count;
        }
      });
      setBadges(newBadges);
    }
    loadBadges();
    const interval = setInterval(loadBadges, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const filteredItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className="hidden w-[260px] flex-shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Care Diagnostics
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">LIMS Platform</span>
        </div>
      </div>

      {/* Navigation */}
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
                  const badgeCount = badges[item.label];

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all duration-150',
                        isActive
                          ? 'bg-primary/[0.08] text-primary'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] flex-shrink-0 transition-colors duration-150',
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground/70 group-hover:text-foreground',
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span
                          className={cn(
                            'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none',
                            isActive ? 'bg-primary text-primary-foreground' : 'bg-warning/15 text-warning',
                          )}
                        >
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-xs font-semibold">
              {user ? `${user.firstName[0]}${user.lastName[0]}` : '??'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
