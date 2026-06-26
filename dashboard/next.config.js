/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/dashboard',
  allowedDevOrigins: ['192.168.29.211'],
}
module.exports = nextConfig
