export default function manifest() {
  return {
    name: 'EZC GeoMap',
    short_name: 'EZC GeoMap',
    description: 'East Zimbabwe Conference GIS Platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#11321c',
    theme_color: '#2E7D32',
    icons: [
      {
        src: '/sda_logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/sda_logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
