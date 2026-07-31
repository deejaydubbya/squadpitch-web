/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        // COOP/COEP headers required for SharedArrayBuffer (ffmpeg.wasm)
        // Scoped to studio pages to avoid breaking third-party embeds
        source: '/workspaces/:path*/studio/:rest*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
