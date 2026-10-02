import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ReviseFlow — Never Miss a Revision',
    short_name: 'ReviseFlow',
    description: 'Modern spaced-revision planner that helps students remember what they study.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0f11',
    theme_color: '#6366f1',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
