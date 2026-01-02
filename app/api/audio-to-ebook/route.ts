import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const CENTRAL_API_BASE = process.env.NEXT_PUBLIC_CENTRAL_API_URL || 'https://craudiovizai.com/api'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CREDIT_COST = 75

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const audioUrl = formData.get('audioUrl') as string | null
    const userId = formData.get('userId') as string | null
    const title = formData.get('title') as string || 'Transcribed Book'
    const format = (formData.get('format') as string) || 'docx'

    if (!audioFile && !audioUrl) {
      return NextResponse.json({ error: 'Provide audio file or URL' }, { status: 400 })
    }

    // Check credits
    if (userId) {
      try {
        const creditRes = await fetch(`${CENTRAL_API_BASE}/credits/balance`, {
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userId }
        })
        const creditData = await creditRes.json()
        
        if (creditData.success && creditData.data && creditData.data.balance < CREDIT_COST) {
          return NextResponse.json({ 
            error: 'Insufficient credits',
            required: CREDIT_COST,
            available: creditData.data.balance
          }, { status: 402 })
        }
      } catch (e) {
        console.warn('Credit check failed:', e)
      }
    }

    let audioArrayBuffer: ArrayBuffer

    if (audioFile) {
      audioArrayBuffer = await audioFile.arrayBuffer()
    } else if (audioUrl) {
      const response = await fetch(audioUrl)
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch audio from URL' }, { status: 400 })
      }
      audioArrayBuffer = await response.arrayBuffer()
    } else {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    // Create a proper File object from ArrayBuffer
    const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' })
    const audioFileForWhisper = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' })

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFileForWhisper,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    })

    const fullText = transcription.text
    const chapters = structureIntoChapters(fullText)

    let fileBuffer: Buffer
    let contentType: string
    let fileExtension: string

    if (format === 'docx') {
      const doc = createDocxDocument(title, chapters)
      fileBuffer = await Packer.toBuffer(doc)
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      fileExtension = 'docx'
    } else if (format === 'md') {
      const markdown = createMarkdown(title, chapters)
      fileBuffer = Buffer.from(markdown, 'utf-8')
      contentType = 'text/markdown'
      fileExtension = 'md'
    } else {
      const plainText = createPlainText(title, chapters)
      fileBuffer = Buffer.from(plainText, 'utf-8')
      contentType = 'text/plain'
      fileExtension = 'txt'
    }

    const slug = slugify(title)
    const storagePath = `ebooks/transcribed/${slug}-${Date.now()}.${fileExtension}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('assets')
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload book' }, { status: 500 })
    }

    // Deduct credits
    if (userId) {
      try {
        await fetch(`${CENTRAL_API_BASE}/credits/deduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
          body: JSON.stringify({
            amount: CREDIT_COST,
            description: `Transcribed audio to eBook: ${title}`,
            metadata: { title, format }
          })
        })
      } catch (e) {
        console.warn('Credit deduction failed:', e)
      }
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('assets')
      .getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      ebook: {
        title,
        format: fileExtension,
        chapters: chapters.length,
        wordCount: fullText.split(/\s+/).length,
        downloadUrl: urlData.publicUrl,
        storagePath
      },
      creditsUsed: CREDIT_COST
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ 
      error: 'Failed to transcribe audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    creditCost: CREDIT_COST,
    supportedFormats: ['mp3', 'wav', 'm4a', 'webm', 'mp4'],
    outputFormats: ['docx', 'txt', 'md'],
    maxFileSize: '25MB'
  })
}

interface Chapter {
  title: string
  content: string
}

function structureIntoChapters(text: string): Chapter[] {
  const chapters: Chapter[] = []
  const WORDS_PER_CHAPTER = 1500

  const words = text.split(/\s+/)
  const totalChapters = Math.max(1, Math.ceil(words.length / WORDS_PER_CHAPTER))

  for (let i = 0; i < totalChapters; i++) {
    const start = i * WORDS_PER_CHAPTER
    const end = Math.min((i + 1) * WORDS_PER_CHAPTER, words.length)
    const chapterWords = words.slice(start, end)
    
    chapters.push({
      title: `Chapter ${i + 1}`,
      content: chapterWords.join(' ')
    })
  }

  return chapters
}

function createDocxDocument(title: string, chapters: Chapter[]): Document {
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 72 })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Transcribed with Javari Books', italics: true, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 }
    })
  )

  chapters.forEach((chapter, index) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: chapter.title, bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: index > 0,
        spacing: { after: 200 }
      })
    )

    const paragraphs = chapter.content.match(/[^.!?]+[.!?]+/g) || [chapter.content]
    const groupedParagraphs: string[] = []
    
    for (let i = 0; i < paragraphs.length; i += 3) {
      groupedParagraphs.push(paragraphs.slice(i, i + 3).join(' '))
    }

    groupedParagraphs.forEach(para => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para.trim(), size: 24 })],
          spacing: { after: 200 }
        })
      )
    })
  })

  return new Document({ sections: [{ children }] })
}

function createMarkdown(title: string, chapters: Chapter[]): string {
  let md = `# ${title}\n\n*Transcribed with Javari Books*\n\n---\n\n`
  chapters.forEach(chapter => {
    md += `## ${chapter.title}\n\n${chapter.content}\n\n`
  })
  return md
}

function createPlainText(title: string, chapters: Chapter[]): string {
  let text = `${title}\n${'='.repeat(title.length)}\n\nTranscribed with Javari Books\n\n`
  chapters.forEach(chapter => {
    text += `${chapter.title}\n${'-'.repeat(chapter.title.length)}\n\n${chapter.content}\n\n`
  })
  return text
}
