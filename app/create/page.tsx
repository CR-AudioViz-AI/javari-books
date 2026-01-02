'use client'

import { useState } from 'react'
import { BookOpen, Sparkles, Loader2, Download, Zap } from 'lucide-react'
import { toast } from 'sonner'

export default function CreatePage() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  // Single book form
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('general')
  const [chapters, setChapters] = useState(5)
  const [style, setStyle] = useState<'professional' | 'conversational' | 'academic'>('professional')

  // Bulk form
  const [bulkBooks, setBulkBooks] = useState('')

  const handleSingleGenerate = async () => {
    if (!title || !topic) {
      toast.error('Please fill in title and topic')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/generate-ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, topic, audience, chapters, style })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.book)
        toast.success('eBook generated successfully!')
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch (error) {
      toast.error('Failed to generate eBook')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkGenerate = async () => {
    const lines = bulkBooks.split('\n').filter(l => l.trim())
    if (lines.length === 0) {
      toast.error('Please enter book specifications')
      return
    }

    const books = lines.map(line => {
      const [title, topic, category] = line.split('|').map(s => s.trim())
      return { title, topic: topic || title, category: category || 'general' }
    })

    setLoading(true)
    try {
      const response = await fetch('/api/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books, chapters, style })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        toast.success(`Generated ${data.generated} books!`)
      } else {
        toast.error(data.error || 'Bulk generation failed')
      }
    } catch (error) {
      toast.error('Failed to generate books')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Create eBook</h1>
          <p className="text-muted-foreground">Generate professional eBooks with AI</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setMode('single')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'single' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            Single Book
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'bulk' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <Zap className="h-5 w-5" />
            Bulk Generation
          </button>
        </div>

        {mode === 'single' ? (
          <div className="bg-card border rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Book Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="The Complete Guide to..."
                  className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Topic/Subject</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Machine learning, cooking, business strategy..."
                  className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Target Audience</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border bg-background"
                  >
                    <option value="general">General</option>
                    <option value="beginners">Beginners</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="professionals">Professionals</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Chapters</label>
                  <select
                    value={chapters}
                    onChange={(e) => setChapters(parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg border bg-background"
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} chapters</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Writing Style</label>
                <div className="flex gap-4">
                  {(['professional', 'conversational', 'academic'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                        style === s 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'hover:border-primary/50'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSingleGenerate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate eBook (50 credits)
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Book Specifications (one per line)
                </label>
                <p className="text-sm text-muted-foreground mb-2">
                  Format: Title | Topic | Category
                </p>
                <textarea
                  value={bulkBooks}
                  onChange={(e) => setBulkBooks(e.target.value)}
                  placeholder="The AI Revolution | artificial intelligence | technology
Marketing Mastery | digital marketing | business
Cooking for Beginners | home cooking | lifestyle"
                  rows={10}
                  className="w-full px-4 py-3 rounded-lg border bg-background font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{bulkBooks.split('\n').filter(l => l.trim()).length} books</span>
                <span>40 credits each (bulk discount)</span>
              </div>

              <button
                onClick={handleBulkGenerate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Generate All Books
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-8 bg-card border rounded-xl p-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {mode === 'single' ? 'Generated eBook' : 'Generation Results'}
            </h2>

            {mode === 'single' && result.downloadUrl && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Title:</span> {result.title}</div>
                  <div><span className="text-muted-foreground">Chapters:</span> {result.chapters}</div>
                  <div><span className="text-muted-foreground">Words:</span> {result.wordCount?.toLocaleString()}</div>
                </div>
                <a
                  href={result.downloadUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  Download eBook
                </a>
              </div>
            )}

            {mode === 'bulk' && result.results && (
              <div className="space-y-4">
                <div className="flex gap-4 text-sm">
                  <span className="text-green-500">✓ {result.generated} generated</span>
                  {result.failed > 0 && <span className="text-red-500">✗ {result.failed} failed</span>}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {result.results.map((book: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span>{book.title}</span>
                      <a href={book.downloadUrl} target="_blank" className="text-primary hover:underline text-sm">
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
