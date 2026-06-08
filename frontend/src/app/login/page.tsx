'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { toast } from 'sonner';
import {
  Activity,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  UserCog,
  FlaskConical,
  Stethoscope,
  Building,
} from 'lucide-react';
import { motion } from 'framer-motion';

const DEMO_CREDENTIALS = [
  {
    role: 'Admin',
    email: 'admin@carediagnostics.com',
    password: 'Admin@123456',
    icon: Shield,
    color:
      'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 dark:hover:bg-blue-900/50',
  },
  {
    role: 'Receptionist',
    email: 'receptionist@carediagnostics.com',
    password: 'Staff@123456',
    icon: UserCog,
    color:
      'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60 dark:hover:bg-emerald-900/50',
  },
  {
    role: 'Lab Tech',
    email: 'labtech@carediagnostics.com',
    password: 'Staff@123456',
    icon: FlaskConical,
    color:
      'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/60 dark:hover:bg-violet-900/50',
  },
  {
    role: 'Pathologist',
    email: 'pathologist@carediagnostics.com',
    password: 'Staff@123456',
    icon: Stethoscope,
    color:
      'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 dark:hover:bg-amber-900/50',
  },
  {
    role: 'Client (Apollo)',
    email: 'apollo@carediagnostics.com',
    password: 'Client@123456',
    icon: Building,
    color:
      'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/60 dark:hover:bg-cyan-900/50',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const loadUser = useAuthStore((s) => s.loadUser);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkedExistingSession, setCheckedExistingSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadUser({ force: true }).finally(() => {
      if (!cancelled) setCheckedExistingSession(true);
    });

    return () => {
      cancelled = true;
    };
  }, [loadUser]);

  useEffect(() => {
    if (checkedExistingSession && !isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [checkedExistingSession, isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      toast.success('Welcome back!');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (cred: (typeof DEMO_CREDENTIALS)[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="fixed right-5 top-5 z-20">
        <ThemeToggle />
      </div>
      {/* Left Panel — Branding */}
      <div className="hidden w-[480px] flex-col justify-between border-r border-border/60 bg-card p-12 lg:flex">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-foreground">
              Care Diagnostics
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
                Laboratory Information
                <br />
                Management System
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Streamline your diagnostic workflows with precision. Manage patients, track samples,
                and generate reports — all in one calm, reliable platform.
              </p>
            </div>

            <div className="space-y-3">
              {[
                'Patient registration & visit management',
                'Sample tracking & result verification',
                'Automated report generation',
                'Complete billing & invoicing',
              ].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.3 }}
                  className="flex items-center gap-2.5"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>
                  <span className="text-[13.5px] text-muted-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* Stats Badges */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className="flex gap-3 pt-2"
            >
              {[
                { label: 'End-to-End', desc: 'Workflow' },
                { label: 'Role-Based', desc: 'Access' },
                { label: 'Real-Time', desc: 'Tracking' },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-center"
                >
                  <p className="text-[12px] font-semibold text-foreground">{badge.label}</p>
                  <p className="text-[10px] text-muted-foreground">{badge.desc}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        <p className="text-[12px] text-muted-foreground/60">
          &copy; {new Date().getFullYear()} Care Diagnostics. All rights reserved.
        </p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex flex-1 items-center justify-center bg-muted/30 px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-[17px] font-semibold tracking-tight">Care Diagnostics</span>
          </div>

          <div className="mb-8">
            <h1 className="text-[24px] font-bold tracking-tight text-foreground">Sign in</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Enter your credentials to access the platform.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@carediagnostics.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-10 rounded-lg border-border/60 bg-card text-[14px] placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px] font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 rounded-lg border-border/60 bg-card pr-10 text-[14px] placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-10 w-full rounded-lg text-[14px] font-medium shadow-sm"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Quick-Fill Demo Credentials */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="mt-8"
          >
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Quick Demo Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => fillCredentials(cred)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all duration-150 ${cred.color}`}
                >
                  <cred.icon className="h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="text-[12.5px] font-medium leading-none">{cred.role}</p>
                    <p className="mt-0.5 text-[10px] opacity-70 leading-none">Click to fill</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
