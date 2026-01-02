import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { supabaseAdmin } from '@/lib/supabase'
import { slugify, CREDIT_COSTS } from '@/lib/utils'
import OpenAI, { toFile } from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()

      if (!profile || profile.credits < CREDIT_COSTS.AUDIO_TO_EBOOK) {
        return NextResponse.json({ 
          error: 'Insufficient credits',
          required: CREDIT_COSTS.AUDIO_TO_EBOOK,
          available: profile?.credits || 0
        }, { status: 402 })
      }
    }

    let audioBlob: Blob

    if (audioFile) {
      audioBlob = audioFile
    } else if (audioUrl) {
      const response = await fetch(audioUrl)
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch audio from URL' }, { status: 400 })
      }
      audioBlob = await response.blob()
    } else {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    // Convert to File for OpenAI
    const file = await toFile(audioBlob, 'audio.mp3', { type: 'audio/mpeg' })

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'text'
    })

    const fullText = transcription

    // Structure the transcription into chapters
    const chapters = structureIntoChapters(fullText)

    // Generate the document
    let fileBuffer: Buffer
    let contentType: string
    let fileExtension: string

    if (format === 'docx') {
      const doc = createDocxDocument(title, chapters)
      fileBuffer = await Packer.toBuffer(doc) as Buffer
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

    // Upload to storage
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

    // Track conversion
    if (userId) {
      await supabaseAdmin.from('conversion_jobs').insert({
        user_id: userId,
        conversion_type: 'audio_to_ebook',
        status: 'completed',
        output_path: storagePath,
        credits_used: CREDIT_COSTS.AUDIO_TO_EBOOK,
        metadata: {
          title,
          format,
          chapters: chapters.length,
          wordCount: fullText.split(/\s+/).length
        }
      })

      await supabaseAdmin.rpc('decrement_credits', {
        user_id: userId,
        amount: CREDIT_COSTS.AUDIO_TO_EBOOK
      })
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
      creditsUsed: CREDIT_COSTS.AUDIO_TO_EBOOK
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
    creditCost: CREDIT_COSTS.AUDIO_TO_EBOOK,
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
