// GET /api/jobs/[id]/status - Get job status and progress
// Used for polling from the UI

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    const { data: job, error } = await supabaseAdmin
      .from('conversion_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress_percent,
        currentStep: job.current_step,
        totalItems: job.total_items,
        completedItems: job.completed_items,
        estimatedDuration: job.estimated_duration,
        output: job.output_data,
        error: job.error_message,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at
      }
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 })
  }
}
