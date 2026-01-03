import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Enable 5-minute timeout for Pro plan
export const maxDuration = 300

const CENTRAL_API_BASE = process.env.NEXT_PUBLIC_CENTRAL_API_URL || 'https://craudiovizai.com/api'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CREDIT_COST = 100

const VOICES: Record<string, string> = {
  alloy: 'Alloy - Neutral',
  echo: 'Echo - Male',
  fable: 'Fable - British',
  onyx: 'Onyx - Deep Male',
  nova: 'Nova - Female',
  shimmer: 'Shimmer - Soft Female'
}

interface ConvertRequest {
  bookId?: string
  text?: string
  voice?: string
  userId?: string
  title?: string
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
  const words = text.split(/\s+/).length
  const minutes = Math.ceil(words / 150)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`
}

export async function POST(request: NextRequest) {
  try {
    const body: ConvertRequest = await request.json()
    const { bookId, text, voice = 'nova', userId, title } = body

    if (!bookId && !text) {
      return NextResponse.json({ error: 'Provide bookId or text' }, { status: 400 })
    }

    // Check credits via central API
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

    let textContent = text
    let bookTitle = title || 'Untitled'

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
      textContent = text || `Content of ${book.name}`
    }

    if (!textContent) {
      return NextResponse.json({ error: 'No text content to convert' }, { status: 400 })
    }

    // Split text into chunks (OpenAI TTS has 4096 char limit)
    const chunks = splitIntoChunks(textContent, 4000)
    const audioBuffers: Buffer[] = []

    console.log(`Processing ${chunks.length} chunks for "${bookTitle}"`)

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Converting chunk ${i + 1}/${chunks.length}...`)
      
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: chunks[i]
      })

      const buffer = Buffer.from(await mp3Response.arrayBuffer())
      audioBuffers.push(buffer)
    }

    const combinedAudio = Buffer.concat(audioBuffers)
    const slug = bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const audioPath = `audiobooks/${slug}-${Date.now()}.mp3`

    console.log(`Uploading ${(combinedAudio.length / 1024 / 1024).toFixed(2)}MB to ${audioPath}`)

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

    // Deduct credits
    if (userId) {
      try {
        await fetch(`${CENTRAL_API_BASE}/credits/deduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
          body: JSON.stringify({
            amount: CREDIT_COST,
            description: `Converted to audiobook: ${bookTitle}`,
            metadata: { bookId, title: bookTitle }
          })
        })
      } catch (e) {
        console.warn('Credit deduction failed:', e)
      }
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('assets')
      .getPublicUrl(audioPath)

    return NextResponse.json({
      success: true,
      audiobook: {
        title: bookTitle,
        voice: VOICES[voice] || voice,
        duration: estimateDuration(textContent),
        downloadUrl: urlData.publicUrl,
        storagePath: audioPath,
        chunks: chunks.length,
        fileSize: combinedAudio.length
      },
      creditsUsed: CREDIT_COST
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
    creditCost: CREDIT_COST,
    maxCharsPerChunk: 4000,
    maxDuration: '300 seconds (Pro plan)',
    supportedFormats: ['docx', 'txt', 'md']
  })
}
