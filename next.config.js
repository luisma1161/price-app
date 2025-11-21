/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next to make a static site
  output: 'export',

  // If you use next/image anywhere, this keeps it static-friendly
  images: { unoptimized: true },

  // (Optional but helpful for Netlify static hosting)
  trailingSlash: true,
};

module.exports = nextConfig;
