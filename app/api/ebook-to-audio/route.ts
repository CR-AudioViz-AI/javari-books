import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CREDIT_COSTS } from '@/lib/utils'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const VOICES = {
  alloy: 'Alloy - Neutral',
  echo: 'Echo - Male',
  fable: 'Fable - British',
  onyx: 'Onyx - Deep Male',
  nova: 'Nova - Female',
  shimmer: 'Shimmer - Soft Female'
} as const

type VoiceId = keyof typeof VOICES

interface ConvertRequest {
  bookId?: string
  text?: string
  voice?: VoiceId
  userId?: string
  title?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ConvertRequest = await request.json()
    const { bookId, text, voice = 'nova', userId, title } = body

    if (!bookId && !text) {
      return NextResponse.json({ error: 'Provide bookId or text' }, { status: 400 })
    }

    // Check credits
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()

      if (!profile || profile.credits < CREDIT_COSTS.EBOOK_TO_AUDIO) {
        return NextResponse.json({ 
          error: 'Insufficient credits',
          required: CREDIT_COSTS.EBOOK_TO_AUDIO,
          available: profile?.credits || 0
        }, { status: 402 })
      }
    }

    let textContent = text
    let bookTitle = title || 'Untitled'

    // If bookId provided, fetch the book content
    if (bookId) {
      const { data: book } = await supabaseAdmin
        .from('assets')
        .select('name, storage_path')
        .eq('id', bookId)
        .single()

      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 })
      }

      bookTitle = book.name

      // Download the book file
      const { data: fileData } = await supabaseAdmin.storage
        .from('assets')
        .download(book.storage_path)

      if (fileData) {
        // For DOCX, we'd need to parse it - for now, use provided text
        // In production, use mammoth or similar to extract text from DOCX
        textContent = text || `Content of ${book.name}`
      }
    }

    if (!textContent) {
      return NextResponse.json({ error: 'No text content to convert' }, { status: 400 })
    }

    // Split text into chunks (OpenAI TTS has 4096 char limit)
    const chunks = splitIntoChunks(textContent, 4000)
    const audioBuffers: Buffer[] = []

    // Convert each chunk to audio
    for (const chunk of chunks) {
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: chunk
      })

      const buffer = Buffer.from(await mp3Response.arrayBuffer())
      audioBuffers.push(buffer)
    }

    // Combine all audio buffers
    const combinedAudio = Buffer.concat(audioBuffers)

    // Generate storage path
    const slug = bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const audioPath = `audiobooks/${slug}-${Date.now()}.mp3`

    // Upload to Supabase
    const { error: uploadError } = await supabaseAdmin.storage
      .from('assets')
      .upload(audioPath, combinedAudio, {
        contentType: 'audio/mpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 })
    }

    // Track conversion
    if (userId && bookId) {
      await supabaseAdmin.from('conversion_jobs').insert({
        user_id: userId,
        asset_id: bookId,
        conversion_type: 'ebook_to_audio',
        status: 'completed',
        output_path: audioPath,
        credits_used: CREDIT_COSTS.EBOOK_TO_AUDIO
      })
    }

    // Deduct credits
    if (userId) {
      await supabaseAdmin.rpc('decrement_credits', {
        user_id: userId,
        amount: CREDIT_COSTS.EBOOK_TO_AUDIO
      })
    }

    // Get download URL
    const { data: urlData } = supabaseAdmin.storage
      .from('assets')
      .getPublicUrl(audioPath)

    return NextResponse.json({
      success: true,
      audiobook: {
        title: bookTitle,
        voice: VOICES[voice],
        duration: estimateDuration(textContent),
        downloadUrl: urlData.publicUrl,
        storagePath: audioPath,
        chunks: chunks.length
      },
      creditsUsed: CREDIT_COSTS.EBOOK_TO_AUDIO
    })

  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json({ 
      error: 'Failed to convert to audiobook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    voices: VOICES,
    creditCost: CREDIT_COSTS.EBOOK_TO_AUDIO,
    maxCharsPerChunk: 4000,
    supportedFormats: ['docx', 'txt', 'md']
  })
}

function splitIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += ' ' + sentence
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim())
  return chunks
}

function estimateDuration(text: string): string {
  // Average reading speed: 150 words per minute
  const words = text.split(/\s+/).length
  const minutes = Math.ceil(words / 150)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`
  }
  return `${minutes}m`
}
