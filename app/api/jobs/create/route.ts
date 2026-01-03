// POST /api/jobs/create - Create a new conversion job
// Returns immediately with job_id, processing happens async

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface JobRequest {
  type: 'ebook-to-audio' | 'audio-to-ebook' | 'generate-ebook' | 'bulk-convert'
  input: {
    text?: string
    title?: string
    voice?: string
    audioUrl?: string
    format?: string
    books?: Array<{ title: string; text: string }>
  }
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: JobRequest = await request.json()
    const { type, input, userId } = body

    if (!type || !input) {
      return NextResponse.json({ error: 'Type and input required' }, { status: 400 })
    }

    // Calculate estimated chunks/items for progress tracking
    let totalItems = 1
    let estimatedDuration = '1-2 minutes'

    if (type === 'ebook-to-audio' && input.text) {
      const charCount = input.text.length
      totalItems = Math.ceil(charCount / 4000) // chunks
      const minutes = Math.ceil(totalItems * 15 / 60) // ~15 sec per chunk
      estimatedDuration = `${minutes}-${minutes + 2} minutes`
    } else if (type === 'bulk-convert' && input.books) {
      totalItems = input.books.length
      estimatedDuration = `${totalItems * 2}-${totalItems * 3} minutes`
    }

    // Create job record
    const jobId = uuidv4()
    const { data: job, error } = await supabaseAdmin
      .from('conversion_jobs')
      .insert({
        id: jobId,
        type,
        status: 'queued',
        input_data: input,
        user_id: userId,
        total_items: totalItems,
        completed_items: 0,
        progress_percent: 0,
        estimated_duration: estimatedDuration,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create job:', error)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    // Trigger background processing (fire and forget)
    // In production, this would be a proper queue like BullMQ or Inngest
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/jobs/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    }).catch(err => console.error('Failed to trigger processor:', err))

    return NextResponse.json({
      success: true,
      job: {
        id: jobId,
        type,
        status: 'queued',
        totalItems,
        estimatedDuration,
        message: 'Job created. Processing will begin shortly.'
      }
    })

  } catch (error) {
    console.error('Job creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
