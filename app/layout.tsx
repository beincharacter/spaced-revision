import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers/providers'

export const metadata: Metadata = {
  title: 'ReviseFlow — Never Miss a Revision',
  description: 'Modern spaced-revision planner that helps students remember what they study.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ReviseFlow',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#6366f1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
