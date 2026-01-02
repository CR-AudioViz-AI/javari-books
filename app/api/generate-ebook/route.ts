import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Header, Footer, PageNumber, AlignmentType } from 'docx'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Central API for credits (all apps use this)
const CENTRAL_API_BASE = process.env.NEXT_PUBLIC_CENTRAL_API_URL || 'https://craudiovizai.com/api'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CREDIT_COSTS = {
  GENERATE_EBOOK: 50,
  EBOOK_TO_AUDIO: 100,
  AUDIO_TO_EBOOK: 75,
  BULK_GENERATE: 40,
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface GenerateRequest {
  title: string
  topic: string
  audience: string
  chapters: number
  style: 'professional' | 'conversational' | 'academic'
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { title, topic, audience, chapters = 5, style = 'professional', userId } = body

    if (!title || !topic) {
      return NextResponse.json({ error: 'Title and topic are required' }, { status: 400 })
    }

    // Check credits via central API if userId provided
    if (userId) {
      try {
        const creditRes = await fetch(`${CENTRAL_API_BASE}/credits/balance`, {
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': userId
          }
        })
        const creditData = await creditRes.json()
        
        if (creditData.success && creditData.data && creditData.data.balance < CREDIT_COSTS.GENERATE_EBOOK) {
          return NextResponse.json({ 
            error: 'Insufficient credits',
            required: CREDIT_COSTS.GENERATE_EBOOK,
            available: creditData.data.balance
          }, { status: 402 })
        }
      } catch (e) {
        // Continue without credit check if central API unavailable
        console.warn('Credit check failed, continuing:', e)
      }
    }

    // Generate book content with AI
    const bookContent = await generateBookContent(title, topic, audience, chapters, style)

    // Create DOCX document
    const doc = createDocument(title, bookContent)
    const buffer = await Packer.toBuffer(doc)

    // Generate slug and paths
    const slug = slugify(title)
    const storagePath = `ebooks/generated/${slug}-${Date.now()}.docx`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('assets')
      .upload(storagePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload book' }, { status: 500 })
    }

    // Create database record
    const { data: book, error: dbError } = await supabaseAdmin
      .from('assets')
      .insert({
        name: title,
        slug,
        description: `AI-generated book about ${topic} for ${audience}`,
        category_id: process.env.EBOOKS_CATEGORY_ID,
        storage_path: storagePath,
        file_extension: 'docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        is_free: false,
        is_public: true,
        price_cents: 2499,
        tags: [topic.toLowerCase(), style, 'ai-generated'],
        uploaded_by: userId || null,
        owned_by: userId || null,
        status: 'active'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
    }

    // Deduct credits via central API
    if (userId) {
      try {
        await fetch(`${CENTRAL_API_BASE}/credits/deduct`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': userId
          },
          body: JSON.stringify({
            amount: CREDIT_COSTS.GENERATE_EBOOK,
            description: `Generated eBook: ${title}`,
            metadata: { book_id: book?.id, title, topic }
          })
        })
      } catch (e) {
        console.warn('Credit deduction failed:', e)
      }
    }

    // Get download URL
    const { data: urlData } = supabaseAdmin.storage
      .from('assets')
      .getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      book: {
        id: book?.id,
        title,
        slug,
        chapters: bookContent.chapters.length,
        wordCount: bookContent.wordCount,
        downloadUrl: urlData.publicUrl,
        storagePath
      },
      creditsUsed: CREDIT_COSTS.GENERATE_EBOOK
    })

  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate book',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function generateBookContent(
  title: string,
  topic: string,
  audience: string,
  chapterCount: number,
  style: string
) {
  const chapters: { title: string; content: string }[] = []
  let totalWords = 0

  const outlinePrompt = `Create ${chapterCount} chapter titles for a book called "${title}" about ${topic} for ${audience}. 
Style: ${style}. 
Return only the chapter titles, one per line, numbered.`

  const outlineResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: outlinePrompt }],
    max_tokens: 500
  })

  const chapterTitles = outlineResponse.choices[0].message.content
    ?.split('\n')
    .filter(line => line.trim())
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .slice(0, chapterCount) || []

  for (const chapterTitle of chapterTitles) {
    const contentPrompt = `Write a detailed chapter for the book "${title}".
Chapter Title: ${chapterTitle}
Topic: ${topic}
Audience: ${audience}
Style: ${style}

Write 2-3 substantive paragraphs (about 300-400 words total). Be informative and engaging.
Do not include the chapter title in your response - just the content.`

    const contentResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: contentPrompt }],
      max_tokens: 800
    })

    const content = contentResponse.choices[0].message.content || ''
    const wordCount = content.split(/\s+/).length
    totalWords += wordCount

    chapters.push({ title: chapterTitle, content })
  }

  return { chapters, wordCount: totalWords }
}

function createDocument(title: string, content: { chapters: { title: string; content: string }[]; wordCount: number }) {
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 72 })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Created with Javari Books', italics: true, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'CR AudioViz AI, LLC', size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 }
    })
  )

  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Table of Contents', bold: true, size: 36 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    })
  )

  content.chapters.forEach((chapter, index) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${index + 1}. ${chapter.title}`, size: 24 })],
        spacing: { after: 100 }
      })
    )
  })

  content.chapters.forEach((chapter, index) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Chapter ${index + 1}: ${chapter.title}`, bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { after: 200 }
      })
    )

    const paragraphs = chapter.content.split('\n\n').filter(p => p.trim())
    paragraphs.forEach(para => {
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
      properties: {},
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
