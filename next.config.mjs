/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://portly-api.vqh9mnrdbp.workers.dev/api/:path*',
      },
    ];
  },
};

export default nextConfig;
