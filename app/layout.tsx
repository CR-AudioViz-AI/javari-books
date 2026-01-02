import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Javari Books | AI-Powered eBook & Audiobook Platform',
  description: 'Create, convert, and manage professional eBooks and audiobooks with AI. Generate books autonomously, convert eBooks to audiobooks, and transcribe audio to text.',
  keywords: 'ebook generator, audiobook converter, AI writing, text to speech, speech to text',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  )
}

function Navigation() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">📚</span>
            <span>Javari Books</span>
          </a>
          <div className="flex items-center gap-6">
            <a href="/create" className="text-sm font-medium hover:text-primary transition-colors">
              Create eBook
            </a>
            <a href="/convert" className="text-sm font-medium hover:text-primary transition-colors">
              Convert
            </a>
            <a href="/library" className="text-sm font-medium hover:text-primary transition-colors">
              Library
            </a>
            <a href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
              Dashboard
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
