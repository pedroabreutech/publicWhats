import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep serving existing static corpus & assets from /public
  poweredByHeader: false,
};

export default nextConfig;
