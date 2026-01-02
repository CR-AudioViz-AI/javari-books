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

      const response = await fetch(`/api/library?${params}`)
      const data = await response.json()

      setBooks(data.books || [])
      setCategories(data.categories || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch library')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">eBook Library</h1>
          <p className="text-muted-foreground">
            Browse {total.toLocaleString()}+ professional eBooks
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search books..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setShowFreeOnly(!showFreeOnly)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
              showFreeOnly ? 'border-primary bg-primary/10 text-primary' : ''
            }`}
          >
            <Filter className="h-4 w-4" />
            Free Only
          </button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Categories */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <h3 className="font-semibold mb-4">Categories</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                All Books
              </button>
              {categories.slice(0, 15).map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all flex justify-between ${
                    selectedCategory === cat.name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <span className="capitalize">{cat.name}</span>
                  <span className="text-sm opacity-70">{cat.count}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Book Grid */}
          <div className="flex-1">
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.map(book => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function BookCard({ book }: { book: Book }) {
  return (
    <div className="bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-all group">
      <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <BookOpen className="h-16 w-16 text-primary/40" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {book.name}
          </h3>
          {book.is_premium ? (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex-shrink-0">
              ${(book.price / 100).toFixed(2)}
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full flex-shrink-0">
              FREE
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {book.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {book.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-muted rounded capitalize">
                {tag}
              </span>
            ))}
          </div>
          <a
            href={book.downloadUrl}
            target="_blank"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>
      </div>
    </div>
  )
}
