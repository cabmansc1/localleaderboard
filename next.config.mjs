/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // db/schema.sql is read at runtime by lib/db.js, so keep it in the trace.
  outputFileTracingIncludes: {
    '/api/board': ['./db/schema.sql']
  }
};

export default nextConfig;
