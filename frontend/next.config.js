/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Browser hanya berbicara ke origin yang sama; Next meneruskan /api/* ke backend.
  // Dengan begitu cookie sesi HttpOnly bersifat same-origin.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};
