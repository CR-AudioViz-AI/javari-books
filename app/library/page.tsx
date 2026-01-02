'use client'

import { useState, useEffect } from 'react'
import { Search, Download, BookOpen, Filter, Loader2 } from 'lucide-react'

interface Book {
  id: string
  name: string
  slug: string
  description: string
  downloadUrl: string
  is_premium: boolean
  price: number
  tags: string[]
  metadata?: {
    chapters?: number
    word_count?: number
  }
  created_at: string
}

interface Category {
  name: string
  count: number
}

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showFreeOnly, setShowFreeOnly] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchBooks()
  }, [search, selectedCategory, showFreeOnly])

  const fetchBooks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedCategory) params.set('category', selectedCategory)
      if (showFreeOnly) params.set('free', 'true')
      params.set('limit', '50')

      const response = await fetch('/api/library?' + params.toString())
      const data = await response.json()

      setBooks(data.books || [])
      setCategories(data.categories || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch library:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">eBook Library</h1>
          <p className="text-muted-foreground">Browse {total.toLocaleString()} professional eBooks</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search books..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={() => setShowFreeOnly(!showFreeOnly)}
            className={'flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ' + (showFreeOnly ? 'border-primary bg-primary/10 text-primary' : '')}
          >
            <Filter className="h-4 w-4" />
            Free Only
          </button>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory(null)}
              className={'px-3 py-1 rounded-full text-sm transition-all ' + (!selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}
            >
              All
            </button>
            {categories.slice(0, 15).map(cat => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={'px-3 py-1 rounded-full text-sm transition-all ' + (selectedCategory === cat.name ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No books found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map(book => (
              <div key={book.id} className="bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-primary/40" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold mb-1 line-clamp-2">{book.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{book.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {book.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-muted rounded text-xs">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={'font-bold ' + (book.price === 0 ? 'text-green-500' : 'text-primary')}>
                      {formatPrice(book.price)}
                    </span>
                    <a
                      href={book.downloadUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
