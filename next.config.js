/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // domains: [process.env.APP_DOMAIN],
    loader: 'akamai',
    path: '',
  },
};

module.exports = nextConfig;
