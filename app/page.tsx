import Link from 'next/link'
import { BookOpen, Headphones, FileAudio, Sparkles, Library, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Unified eBook & Audiobook Platform
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Create. Convert. <span className="text-primary">Publish.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Generate professional eBooks with AI, convert them to audiobooks, or transcribe 
              audio to text. All in one powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/create"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors"
              >
                <BookOpen className="h-5 w-5" />
                Create eBook
              </Link>
              <Link
                href="/convert"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-secondary text-secondary-foreground rounded-lg font-semibold text-lg hover:bg-secondary/80 transition-colors"
              >
                <Headphones className="h-5 w-5" />
                Convert
              </Link>
              <Link
                href="/library"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border rounded-lg font-semibold text-lg hover:bg-muted transition-colors"
              >
                <Library className="h-5 w-5" />
                Browse Library
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete Publishing Suite</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create, convert, and manage your book library.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BookOpen className="h-8 w-8 text-primary" />}
              title="AI eBook Generator"
              description="Create full-length professional eBooks with AI. Structured chapters, proper formatting, ready for publishing."
              href="/create"
            />
            <FeatureCard
              icon={<Headphones className="h-8 w-8 text-primary" />}
              title="eBook to Audiobook"
              description="Convert any eBook to a professional audiobook using advanced text-to-speech with multiple voice options."
              href="/convert?mode=ebook-to-audio"
            />
            <FeatureCard
              icon={<FileAudio className="h-8 w-8 text-primary" />}
              title="Audiobook to eBook"
              description="Transcribe audiobooks to formatted eBooks. Perfect for repurposing audio content into written form."
              href="/convert?mode=audio-to-ebook"
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-primary" />}
              title="Bulk Generation"
              description="Generate hundreds of eBooks autonomously. Perfect for building content libraries at scale."
              href="/create?mode=bulk"
            />
            <FeatureCard
              icon={<Library className="h-8 w-8 text-primary" />}
              title="300+ eBook Library"
              description="Access our growing library of professional eBooks across technology, business, and more."
              href="/library"
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-primary" />}
              title="Smart Credits"
              description="Pay only for what you use. Credits never expire on paid plans, automatic refunds on errors."
              href="/dashboard"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard value="301+" label="eBooks Available" />
            <StatCard value="5" label="Export Formats" />
            <StatCard value="12" label="AI Voices" />
            <StatCard value="99.9%" label="Uptime" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Creating?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join creators using AI to build professional book libraries.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-background text-foreground rounded-lg font-semibold text-lg hover:bg-background/90 transition-colors"
          >
            Create Your First eBook
            <Sparkles className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="mb-2">
            <strong>Javari Books</strong> by CR AudioViz AI, LLC
          </p>
          <p className="text-sm">"Your Story. Our Design. Everyone Connects. Everyone Wins."</p>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  href 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  href: string
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-background rounded-xl p-6 shadow-sm border hover:shadow-md hover:border-primary/50 transition-all h-full">
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  )
}
