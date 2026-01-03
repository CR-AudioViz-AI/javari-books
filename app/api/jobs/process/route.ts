// POST /api/jobs/process - Background job processor
// Adapted for existing conversion_jobs table schema

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

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

interface JobMetadata {
  input_data: any
  total_items: number
  completed_items: number
  current_step: string
  estimated_duration?: string
  output_data?: any
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

function structureIntoChapters(text: string): string[] {
  const words = text.split(/\s+/)
  const WORDS_PER_CHAPTER = 1500
  const chapters: string[] = []
  for (let i = 0; i < words.length; i += WORDS_PER_CHAPTER) {
    chapters.push(words.slice(i, i + WORDS_PER_CHAPTER).join(' '))
  }
  return chapters
}

async function getJobMetadata(job: any): Promise<JobMetadata> {
  try {
    return JSON.parse(job.output_path || '{}')
  } catch {
    return { input_data: {}, total_items: 1, completed_items: 0, current_step: 'Processing' }
  }
}

async function updateJob(jobId: string, updates: Record<string, any>) {
  await supabaseAdmin.from('conversion_jobs').update(updates).eq('id', jobId)
}

async function processEbookToAudio(job: any) {
  const jobId = job.id
  const meta = await getJobMetadata(job)
  const { text, title = 'Untitled', voice = 'nova' } = meta.input_data
  
  await updateJob(jobId, { status: 'processing', started_at: new Date().toISOString() })

  const chunks = splitIntoChunks(text, 4000)
  const totalChunks = chunks.length
  const audioBuffers: Buffer[] = []

  for (let i = 0; i < chunks.length; i++) {
    try {
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: chunks[i]
      })
      audioBuffers.push(Buffer.from(await mp3Response.arrayBuffer()))

      const progress = Math.round(((i + 1) / totalChunks) * 90)
      const currentMeta = { ...meta, completed_items: i + 1, current_step: `Converting chunk ${i + 1}/${totalChunks}...` }
      await updateJob(jobId, { progress, output_path: JSON.stringify(currentMeta) })
    } catch (err: any) {
      await updateJob(jobId, { 
        status: 'failed', 
        error_message: `Chunk ${i + 1} failed: ${err.message}`,
        completed_at: new Date().toISOString()
      })
      return
    }
  }

  const combinedAudio = Buffer.concat(audioBuffers)
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const audioPath = `audiobooks/${slug}-${Date.now()}.mp3`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('assets')
    .upload(audioPath, combinedAudio, { contentType: 'audio/mpeg', upsert: true })

  if (uploadError) {
    await updateJob(jobId, { status: 'failed', error_message: uploadError.message, completed_at: new Date().toISOString() })
    return
  }

  const { data: urlData } = supabaseAdmin.storage.from('assets').getPublicUrl(audioPath)

  const finalMeta = {
    ...meta,
    current_step: 'Complete!',
    output_data: {
      title,
      voice: VOICES[voice] || voice,
      duration: estimateDuration(text),
      downloadUrl: urlData.publicUrl,
      storagePath: audioPath,
      chunks: totalChunks
    }
  }

  await updateJob(jobId, {
    status: 'completed',
    progress: 100,
    output_path: JSON.stringify(finalMeta),
    credits_charged: 100,
    completed_at: new Date().toISOString()
  })
}

async function processAudioToEbook(job: any) {
  const jobId = job.id
  const meta = await getJobMetadata(job)
  const { audioUrl, title = 'Transcribed Book', format = 'txt' } = meta.input_data
  
  await updateJob(jobId, { status: 'processing', started_at: new Date().toISOString() })

  try {
    let audioBuffer: ArrayBuffer
    if (audioUrl.startsWith('data:')) {
      const base64Data = audioUrl.split(',')[1]
      audioBuffer = Buffer.from(base64Data, 'base64')
    } else {
      const response = await fetch(audioUrl)
      if (!response.ok) throw new Error('Failed to fetch audio')
      audioBuffer = await response.arrayBuffer()
    }

    await updateJob(jobId, { progress: 30, output_path: JSON.stringify({ ...meta, current_step: 'Transcribing...' }) })

    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' })
    const transcription = await openai.audio.transcriptions.create({ file: audioFile, model: 'whisper-1' })

    await updateJob(jobId, { progress: 70 })

    const fullText = transcription.text
    const chapters = structureIntoChapters(fullText)
    
    let fileContent = format === 'md' 
      ? `# ${title}\n\n*Transcribed with Javari Books*\n\n---\n\n` + chapters.map((ch, i) => `## Chapter ${i + 1}\n\n${ch}\n\n`).join('')
      : `${title}\n${'='.repeat(title.length)}\n\n` + chapters.map((ch, i) => `Chapter ${i + 1}\n\n${ch}\n\n`).join('')

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const ext = format === 'md' ? 'md' : 'txt'
    const storagePath = `ebooks/transcribed/${slug}-${Date.now()}.${ext}`

    await supabaseAdmin.storage.from('assets').upload(storagePath, Buffer.from(fileContent), { 
      contentType: format === 'md' ? 'text/markdown' : 'text/plain', 
      upsert: true 
    })

    const { data: urlData } = supabaseAdmin.storage.from('assets').getPublicUrl(storagePath)

    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      output_path: JSON.stringify({
        ...meta,
        current_step: 'Complete!',
        output_data: { title, format: ext, chapters: chapters.length, wordCount: fullText.split(/\s+/).length, downloadUrl: urlData.publicUrl }
      }),
      credits_charged: 75,
      completed_at: new Date().toISOString()
    })
  } catch (error: any) {
    await updateJob(jobId, { status: 'failed', error_message: error.message, completed_at: new Date().toISOString() })
  }
}

export async function POST(request: NextRequest) {
  const { jobId } = await request.json()
  if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 })

  const { data: job } = await supabaseAdmin.from('conversion_jobs').select('*').eq('id', jobId).single()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'queued') return NextResponse.json({ message: 'Already processing' })

  const process = async () => {
    if (job.source_type === 'ebook-to-audio') await processEbookToAudio(job)
    else if (job.source_type === 'audio-to-ebook') await processAudioToEbook(job)
    else await updateJob(jobId, { status: 'failed', error_message: `Unknown type: ${job.source_type}` })
  }

  process().catch(err => updateJob(jobId, { status: 'failed', error_message: err.message }))

  return NextResponse.json({ success: true, jobId })
}
