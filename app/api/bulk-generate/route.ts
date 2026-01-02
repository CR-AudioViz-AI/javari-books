import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Header, Footer, PageNumber, AlignmentType } from 'docx'
import { supabaseAdmin } from '@/lib/supabase'
import { slugify, CREDIT_COSTS } from '@/lib/utils'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface BulkGenerateRequest {
  books: {
    title: string
    topic: string
    category: string
  }[]
  userId?: string
  chapters?: number
  style?: 'professional' | 'conversational' | 'academic'
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkGenerateRequest = await request.json()
    const { books, userId, chapters = 5, style = 'professional' } = body

    if (!books || books.length === 0) {
      return NextResponse.json({ error: 'No books provided' }, { status: 400 })
    }

    const totalCost = books.length * CREDIT_COSTS.BULK_GENERATE

    // Check credits
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()

      if (!profile || profile.credits < totalCost) {
        return NextResponse.json({ 
          error: 'Insufficient credits',
          required: totalCost,
          available: profile?.credits || 0
        }, { status: 402 })
      }
    }

    const results: any[] = []
    const errors: any[] = []

    // Process books sequentially to avoid rate limits
    for (const bookSpec of books) {
      try {
        const result = await generateSingleBook(bookSpec, chapters, style)
        results.push(result)
      } catch (error) {
        errors.push({
          title: bookSpec.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Deduct credits for successful generations
    if (userId && results.length > 0) {
      const creditsUsed = results.length * CREDIT_COSTS.BULK_GENERATE
      await supabaseAdmin.rpc('decrement_credits', {
        user_id: userId,
        amount: creditsUsed
      })
    }

    return NextResponse.json({
      success: true,
      generated: results.length,
      failed: errors.length,
      results,
      errors,
      creditsUsed: results.length * CREDIT_COSTS.BULK_GENERATE
    })

  } catch (error) {
    console.error('Bulk generation error:', error)
    return NextResponse.json({ 
      error: 'Bulk generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function generateSingleBook(
  spec: { title: string; topic: string; category: string },
  chapterCount: number,
  style: string
) {
  const { title, topic, category } = spec

  // Generate outline
  const outlinePrompt = `Create ${chapterCount} chapter titles for "${title}" about ${topic}. Return only titles, one per line.`
  
  const outlineResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: outlinePrompt }],
    max_tokens: 300
  })

  const chapterTitles = outlineResponse.choices[0].message.content
    ?.split('\n')
    .filter(line => line.trim())
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .slice(0, chapterCount) || [`Introduction to ${topic}`]

  // Generate chapters
  const chapters: { title: string; content: string }[] = []
  let totalWords = 0

  for (const chapterTitle of chapterTitles) {
    const contentPrompt = `Write 2 paragraphs (250 words) for chapter "${chapterTitle}" of "${title}". Style: ${style}. Content only, no title.`
    
    const contentResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: contentPrompt }],
      max_tokens: 500
    })

    const content = contentResponse.choices[0].message.content || ''
    totalWords += content.split(/\s+/).length
    chapters.push({ title: chapterTitle, content })
  }

  // Create document
  const doc = createBookDocument(title, chapters)
  const buffer = await Packer.toBuffer(doc)

  // Upload
  const slug = slugify(title)
  const storagePath = `ebooks/bulk/${category}/${slug}.docx`

  await supabaseAdmin.storage
    .from('assets')
    .upload(storagePath, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    })

  // Create record
  const { data: book } = await supabaseAdmin
    .from('assets')
    .insert({
      name: title,
      slug,
      description: `AI-generated book about ${topic}`,
      category_id: process.env.EBOOKS_CATEGORY_ID,
      storage_path: storagePath,
      file_type: 'docx',
      is_premium: true,
      price_cents: 2499,
      tags: [category.toLowerCase(), topic.toLowerCase(), 'ai-generated', 'bulk'],
      metadata: {
        chapters: chapters.length,
        word_count: totalWords,
        style,
        generated_at: new Date().toISOString()
      }
    })
    .select()
    .single()

  const { data: urlData } = supabaseAdmin.storage
    .from('assets')
    .getPublicUrl(storagePath)

  return {
    id: book?.id,
    title,
    slug,
    category,
    chapters: chapters.length,
    wordCount: totalWords,
    downloadUrl: urlData.publicUrl
  }
}

function createBookDocument(title: string, chapters: { title: string; content: string }[]): Document {
  const children: Paragraph[] = []

  // Title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 56 })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Javari Books | CR AudioViz AI, LLC', size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  )

  // Chapters
  chapters.forEach((ch, i) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Chapter ${i + 1}: ${ch.title}`, bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: i > 0,
        spacing: { after: 200 }
      })
    )

    ch.content.split('\n\n').filter(p => p.trim()).forEach(para => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para.trim(), size: 24 })],
          spacing: { after: 200 }
        })
      )
    })
  })

  return new Document({
    sections: [{
      headers: {
        default: new Header({
          children: [new Paragraph({ children: [new TextRun({ text: title, italics: true })] })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Page ' }), new TextRun({ children: [PageNumber.CURRENT] })]
          })]
        })
      },
      children
    }]
  })
}

export async function GET() {
  return NextResponse.json({
    creditCostPerBook: CREDIT_COSTS.BULK_GENERATE,
    maxBooksPerBatch: 50,
    chaptersPerBook: { min: 3, max: 10, default: 5 },
    styles: ['professional', 'conversational', 'academic']
  })
}
