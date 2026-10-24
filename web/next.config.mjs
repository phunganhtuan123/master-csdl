/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // để build Docker image gọn
  reactStrictMode: true,
};
export default nextConfig;
