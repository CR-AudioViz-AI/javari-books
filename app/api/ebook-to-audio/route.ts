import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Enable 5-minute timeout for Pro plan
export const maxDuration = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VOICES: Record<string, string> = {
  alloy: 'Alloy - Neutral',
  echo: 'Echo - Male',
  fable: 'Fable - British',
  onyx: 'Onyx - Deep Male',
  nova: 'Nova - Female',
  shimmer: 'Shimmer - Soft Female'
}

interface ConvertRequest {
  text?: string
  voice?: string
  userId?: string
  userEmail?: string
  title?: string
  saveToLibrary?: boolean
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
    const { text, voice = 'nova', userId, userEmail, title, saveToLibrary = true } = body

    if (!text) {
      return NextResponse.json({ error: 'Text content required' }, { status: 400 })
    }

    const bookTitle = title || 'Untitled'

    // Split text into chunks (OpenAI TTS has 4096 char limit)
    const chunks = splitIntoChunks(text, 4000)
    const audioBuffers: Buffer[] = []

    console.log(`Processing ${chunks.length} chunks for "${bookTitle}" by user ${userEmail || userId}`)

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
    const timestamp = Date.now()
    
    // Create user-specific path if userId provided
    const audioPath = userId 
      ? `users/${userId}/audiobooks/${slug}-${timestamp}.mp3`
      : `audiobooks/${slug}-${timestamp}.mp3`

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

    const { data: urlData } = supabaseAdmin.storage
      .from('assets')
      .getPublicUrl(audioPath)

    let assetId: string | undefined

    // Save to user's library (assets table)
    if (saveToLibrary && userId) {
      try {
        const { data: assetData, error: assetError } = await supabaseAdmin
          .from('assets')
          .insert({
            name: bookTitle,
            slug: `${slug}-${timestamp}`,
            original_filename: `${slug}.mp3`,
            file_size_bytes: combinedAudio.length,
            mime_type: 'audio/mpeg',
            file_extension: 'mp3',
            storage_path: audioPath,
            owned_by: userId,
            uploaded_by: userId,
            status: 'active',
            is_public: false,
            is_free: false,
            tags: ['audiobook', 'generated', 'javari-books'],
            metadata: {
              voice: voice,
              voiceLabel: VOICES[voice] || voice,
              duration: estimateDuration(text),
              wordCount: text.split(/\s+/).length,
              chunks: chunks.length,
              generatedBy: 'javari-books',
              generatedAt: new Date().toISOString()
            }
          })
          .select('id')
          .single()

        if (assetError) {
          console.warn('Failed to save to library:', assetError)
        } else {
          assetId = assetData?.id
          console.log(`Saved to library with asset ID: ${assetId}`)
        }
      } catch (e) {
        console.warn('Library save error:', e)
      }
    }

    return NextResponse.json({
      success: true,
      audiobook: {
        title: bookTitle,
        voice: VOICES[voice] || voice,
        duration: estimateDuration(text),
        downloadUrl: urlData.publicUrl,
        storagePath: audioPath,
        chunks: chunks.length,
        fileSize: combinedAudio.length,
        assetId
      }
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
    maxCharsPerChunk: 4000,
    maxDuration: '300 seconds (Pro plan)',
    supportedFormats: ['text'],
    savesToLibrary: true
  })
}
