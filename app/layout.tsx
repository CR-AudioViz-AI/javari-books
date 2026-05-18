// app/layout.tsx
import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Javari Books',
  description: 'AI-powered book discovery and reading tracker',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#07080f' }}>
        {children}
      </body>
    </html>
  )
}
