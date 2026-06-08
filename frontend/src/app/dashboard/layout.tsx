'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AiAssistant } from '@/components/shared/ai-assistant';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { Activity } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadUser({ force: true }).finally(() => {
      if (!cancelled) setCheckingSession(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loadUser]);

  useEffect(() => {
    if (!checkingSession && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [checkingSession, isLoading, isAuthenticated, router]);

  if (checkingSession || isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
          <Activity className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">Loading</span>
          <div className="flex gap-1">
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 scrollbar-thin sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      {/* AI Assistant floating panel */}
      <AiAssistant />
    </div>
  );
}
