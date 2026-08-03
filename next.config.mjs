/** @type {import('next').NextConfig} */
const isExport = process.env.BUILD_TARGET === 'export';

const nextConfig = {
  // Only use static export for CF Pages builds; local dev uses rewrites for API proxy
  ...(isExport ? { output: 'export' } : {}),
  // trailingSlash so Next.js writes /sailing/[id]/index.html as /sailing/[id]/ index
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Local dev only: proxy /api/* to the Cloudflare Worker
  async rewrites() {
    if (isExport) return []; // rewrites not supported with output: export
    return [
      {
        source: '/api/:path*',
        destination: 'https://portly-api.vqh9mnrdbp.workers.dev/api/:path*',
      },
    ];
  },
};

export default nextConfig;
