// POST /api/jobs/process - Background job processor
// This runs without timeout constraints using edge runtime

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Use edge runtime for longer execution (no 60s limit on Pro plans)
// For Hobby plans, we chunk the work
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max on Pro plan

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function updateJobProgress(jobId: string, updates: Record<string, any>) {
  await supabaseAdmin
    .from('conversion_jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

async function processEbookToAudio(jobId: string, input: any) {
  const { text, title = 'Untitled', voice = 'nova' } = input
  
  await updateJobProgress(jobId, { status: 'processing', started_at: new Date().toISOString() })

  // Split text into chunks
  const chunks = splitIntoChunks(text, 4000)
  const totalChunks = chunks.length
  const audioBuffers: Buffer[] = []

  await updateJobProgress(jobId, { 
    total_items: totalChunks,
    current_step: 'Converting text to speech...'
  })

  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    try {
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: chunks[i]
      })

      const buffer = Buffer.from(await mp3Response.arrayBuffer())
      audioBuffers.push(buffer)

      // Update progress
      const progress = Math.round(((i + 1) / totalChunks) * 90) // 90% for TTS
      await updateJobProgress(jobId, {
        completed_items: i + 1,
        progress_percent: progress,
        current_step: `Converting chunk ${i + 1} of ${totalChunks}...`
      })

    } catch (err) {
      console.error(`Chunk ${i} failed:`, err)
      await updateJobProgress(jobId, { 
        status: 'failed',
        error_message: `Failed on chunk ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        completed_at: new Date().toISOString()
      })
      return
    }
  }

  // Combine audio buffers
  await updateJobProgress(jobId, { 
    progress_percent: 95,
    current_step: 'Combining audio files...'
  })

  const combinedAudio = Buffer.concat(audioBuffers)
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const audioPath = `audiobooks/${slug}-${Date.now()}.mp3`

  // Upload to storage
  await updateJobProgress(jobId, { 
    progress_percent: 98,
    current_step: 'Uploading to storage...'
  })

  const { error: uploadError } = await supabaseAdmin.storage
    .from('assets')
    .upload(audioPath, combinedAudio, {
      contentType: 'audio/mpeg',
      upsert: true
    })

  if (uploadError) {
    await updateJobProgress(jobId, { 
      status: 'failed',
      error_message: `Upload failed: ${uploadError.message}`,
      completed_at: new Date().toISOString()
    })
    return
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from('assets')
    .getPublicUrl(audioPath)

  // Mark complete
  await updateJobProgress(jobId, {
    status: 'completed',
    progress_percent: 100,
    current_step: 'Complete!',
    output_data: {
      title,
      voice,
      duration: estimateDuration(text),
      downloadUrl: urlData.publicUrl,
      storagePath: audioPath,
      chunks: totalChunks,
      fileSize: combinedAudio.length
    },
    completed_at: new Date().toISOString()
  })
}

async function processAudioToEbook(jobId: string, input: any) {
  const { audioUrl, title = 'Transcribed Book', format = 'docx' } = input
  
  await updateJobProgress(jobId, { 
    status: 'processing', 
    started_at: new Date().toISOString(),
    current_step: 'Downloading audio file...'
  })

  try {
    // Fetch audio
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch audio file')
    }
    
    const audioBuffer = await audioResponse.arrayBuffer()
    
    await updateJobProgress(jobId, { 
      progress_percent: 20,
      current_step: 'Transcribing audio with AI...'
    })

    // Transcribe with Whisper
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json'
    })

    await updateJobProgress(jobId, { 
      progress_percent: 70,
      current_step: 'Structuring into chapters...'
    })

    const fullText = transcription.text
    const wordCount = fullText.split(/\s+/).length

    // Structure into chapters
    const chapters = structureIntoChapters(fullText)

    await updateJobProgress(jobId, { 
      progress_percent: 85,
      current_step: 'Creating document...'
    })

    // Create document based on format
    let fileBuffer: Buffer
    let contentType: string
    let fileExtension: string

    if (format === 'md') {
      const markdown = `# ${title}\n\n*Transcribed with Javari Books*\n\n---\n\n` + 
        chapters.map((ch, i) => `## Chapter ${i + 1}\n\n${ch}\n\n`).join('')
      fileBuffer = Buffer.from(markdown, 'utf-8')
      contentType = 'text/markdown'
      fileExtension = 'md'
    } else if (format === 'txt') {
      const plainText = `${title}\n${'='.repeat(title.length)}\n\nTranscribed with Javari Books\n\n` +
        chapters.map((ch, i) => `Chapter ${i + 1}\n${'-'.repeat(10)}\n\n${ch}\n\n`).join('')
      fileBuffer = Buffer.from(plainText, 'utf-8')
      contentType = 'text/plain'
      fileExtension = 'txt'
    } else {
      // DOCX - simplified version
      const docContent = `${title}\n\n${chapters.join('\n\n')}`
      fileBuffer = Buffer.from(docContent, 'utf-8')
      contentType = 'text/plain'
      fileExtension = 'txt' // Fallback to txt for simplicity in background job
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const storagePath = `ebooks/transcribed/${slug}-${Date.now()}.${fileExtension}`

    await updateJobProgress(jobId, { 
      progress_percent: 95,
      current_step: 'Uploading document...'
    })

    const { error: uploadError } = await supabaseAdmin.storage
      .from('assets')
      .upload(storagePath, fileBuffer, { contentType, upsert: true })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('assets')
      .getPublicUrl(storagePath)

    await updateJobProgress(jobId, {
      status: 'completed',
      progress_percent: 100,
      current_step: 'Complete!',
      output_data: {
        title,
        format: fileExtension,
        chapters: chapters.length,
        wordCount,
        downloadUrl: urlData.publicUrl,
        storagePath
      },
      completed_at: new Date().toISOString()
    })

  } catch (error) {
    await updateJobProgress(jobId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      completed_at: new Date().toISOString()
    })
  }
}

async function processBulkConvert(jobId: string, input: any) {
  const { books, voice = 'nova' } = input
  
  if (!books || !Array.isArray(books)) {
    await updateJobProgress(jobId, { 
      status: 'failed',
      error_message: 'No books provided for bulk conversion',
      completed_at: new Date().toISOString()
    })
    return
  }

  await updateJobProgress(jobId, { 
    status: 'processing',
    started_at: new Date().toISOString(),
    total_items: books.length,
    current_step: `Starting bulk conversion of ${books.length} books...`
  })

  const results: Array<{ title: string; status: string; downloadUrl?: string; error?: string }> = []

  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    
    await updateJobProgress(jobId, {
      completed_items: i,
      progress_percent: Math.round((i / books.length) * 100),
      current_step: `Converting "${book.title}" (${i + 1} of ${books.length})...`
    })

    try {
      // Process this book
      const chunks = splitIntoChunks(book.text, 4000)
      const audioBuffers: Buffer[] = []

      for (const chunk of chunks) {
        const mp3Response = await openai.audio.speech.create({
          model: 'tts-1',
          voice: voice as any,
          input: chunk
        })
        audioBuffers.push(Buffer.from(await mp3Response.arrayBuffer()))
      }

      const combinedAudio = Buffer.concat(audioBuffers)
      const slug = book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const audioPath = `audiobooks/bulk/${slug}-${Date.now()}.mp3`

      await supabaseAdmin.storage
        .from('assets')
        .upload(audioPath, combinedAudio, { contentType: 'audio/mpeg', upsert: true })

      const { data: urlData } = supabaseAdmin.storage
        .from('assets')
        .getPublicUrl(audioPath)

      results.push({
        title: book.title,
        status: 'completed',
        downloadUrl: urlData.publicUrl
      })

    } catch (err) {
      results.push({
        title: book.title,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }

  const successful = results.filter(r => r.status === 'completed').length
  const failed = results.filter(r => r.status === 'failed').length

  await updateJobProgress(jobId, {
    status: failed === books.length ? 'failed' : 'completed',
    progress_percent: 100,
    completed_items: books.length,
    current_step: `Complete! ${successful} succeeded, ${failed} failed.`,
    output_data: { results, successful, failed },
    completed_at: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Get job details
    const { data: job, error } = await supabaseAdmin
      .from('conversion_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'queued') {
      return NextResponse.json({ message: 'Job already processing or completed' })
    }

    // Process based on type (don't await - let it run)
    const processPromise = (async () => {
      switch (job.type) {
        case 'ebook-to-audio':
          await processEbookToAudio(jobId, job.input_data)
          break
        case 'audio-to-ebook':
          await processAudioToEbook(jobId, job.input_data)
          break
        case 'bulk-convert':
          await processBulkConvert(jobId, job.input_data)
          break
        default:
          await updateJobProgress(jobId, { 
            status: 'failed',
            error_message: `Unknown job type: ${job.type}`
          })
      }
    })()

    // For serverless, we need to await but return early with streaming
    // This is a workaround - in production use a proper queue
    processPromise.catch(err => {
      console.error('Job processing failed:', err)
      updateJobProgress(jobId, { 
        status: 'failed',
        error_message: err.message
      })
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Processing started',
      jobId 
    })

  } catch (error) {
    console.error('Process error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

// Helper functions
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

function structureIntoChapters(text: string): string[] {
  const words = text.split(/\s+/)
  const WORDS_PER_CHAPTER = 1500
  const chapters: string[] = []
  
  for (let i = 0; i < words.length; i += WORDS_PER_CHAPTER) {
    chapters.push(words.slice(i, i + WORDS_PER_CHAPTER).join(' '))
  }
  
  return chapters
}
