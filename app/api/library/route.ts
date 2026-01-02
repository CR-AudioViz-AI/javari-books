import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const free = searchParams.get('free')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('assets')
      .select('id, name, slug, description, storage_path, file_type, is_premium, price_cents, tags, metadata, created_at', { count: 'exact' })
      .eq('category_id', process.env.EBOOKS_CATEGORY_ID)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) {
      query = query.contains('tags', [category.toLowerCase()])
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (free === 'true') {
      query = query.eq('is_premium', false)
    }

    const { data: books, error, count } = await query

    if (error) {
      console.error('Library fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 })
    }

    // Get public URLs for each book
    const booksWithUrls = books?.map(book => {
      const { data: urlData } = supabaseAdmin.storage
        .from('assets')
        .getPublicUrl(book.storage_path)

      return {
        ...book,
        downloadUrl: urlData.publicUrl,
        price: book.is_premium ? book.price_cents : 0
      }
    }) || []

    // Get category stats
    const { data: stats } = await supabaseAdmin
      .from('assets')
      .select('tags')
      .eq('category_id', process.env.EBOOKS_CATEGORY_ID)

    const categoryCounts: Record<string, number> = {}
    stats?.forEach(book => {
      book.tags?.forEach((tag: string) => {
        categoryCounts[tag] = (categoryCounts[tag] || 0) + 1
      })
    })

    return NextResponse.json({
      books: booksWithUrls,
      total: count || 0,
      offset,
      limit,
      categories: Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }))
    })

  } catch (error) {
    console.error('Library error:', error)
    return NextResponse.json({ 
      error: 'Library fetch failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
