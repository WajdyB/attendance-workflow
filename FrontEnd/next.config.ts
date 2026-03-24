/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xnjwhulvfjuazosiuohp.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/avatars/**",
        search: "",
      },
    ],
  },
};

module.exports = nextConfig;

