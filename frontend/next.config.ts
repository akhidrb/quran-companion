import type { NextConfig } from 'next'

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
  // Extend proxy timeout to 30s — Claude + Supabase + alquran.cloud can take up to ~10s
  experimental: {
    proxyTimeout: 30_000,
  },
}

export default nextConfig
