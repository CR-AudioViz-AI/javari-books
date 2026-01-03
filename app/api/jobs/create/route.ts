// POST /api/jobs/create - Create a new conversion job
// Adapted to use existing conversion_jobs table schema

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Calculate estimates
    let estimatedDuration = '1-2 minutes'
    let totalChunks = 1

    if (type === 'ebook-to-audio' && input.text) {
      const charCount = input.text.length
      totalChunks = Math.ceil(charCount / 4000)
      const minutes = Math.ceil(totalChunks * 15 / 60)
      estimatedDuration = `${minutes}-${minutes + 2} minutes`
    } else if (type === 'bulk-convert' && input.books) {
      totalChunks = input.books.length
      estimatedDuration = `${totalChunks * 2}-${totalChunks * 3} minutes`
    }

    // Map to existing table schema
    // source_type will store our job type
    // output_path will store the full job data as JSON string
    const { data: job, error } = await supabaseAdmin
      .from('conversion_jobs')
      .insert({
        user_id: userId || null,
        source_type: type,  // 'ebook-to-audio', 'audio-to-ebook', etc.
        target_type: 'audiobook',  // or 'ebook' based on type
        status: 'queued',
        progress: 0,
        output_path: JSON.stringify({
          input_data: input,
          total_items: totalChunks,
          completed_items: 0,
          current_step: 'Queued',
          estimated_duration: estimatedDuration
        }),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create job:', error)
      return NextResponse.json({ error: 'Failed to create job', details: error.message }, { status: 500 })
    }

    // Trigger background processing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    fetch(`${appUrl}/api/jobs/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id })
    }).catch(err => console.error('Failed to trigger processor:', err))

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type,
        status: 'queued',
        totalItems: totalChunks,
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
