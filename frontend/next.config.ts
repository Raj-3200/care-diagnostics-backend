// Build: 4 — runtime proxy active, BACKEND_URL set via Vercel CLI
import type { NextConfig } from 'next';

const isVercel = !!process.env.VERCEL;
const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  // standalone: for Docker builds only — disabled on Vercel
  output: isProd && !isVercel ? 'standalone' : undefined,

  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },

  // API proxy is now handled by src/app/api/[...path]/route.ts at runtime
  // This reads BACKEND_URL at request time — no build-time baking

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@tanstack/react-query',
      'recharts',
      'date-fns',
    ],
  },
};

export default nextConfig;
