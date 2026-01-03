// GET /api/jobs/[id]/status - Get job status
// Fixed for Next.js 14+ params handling

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params

    const { data: job, error } = await supabaseAdmin
      .from('conversion_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    let meta: any = {}
    try {
      meta = JSON.parse(job.output_path || '{}')
    } catch {}

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.source_type,
        status: job.status,
        progress: job.progress || 0,
        currentStep: meta.current_step || 'Processing...',
        totalItems: meta.total_items || 1,
        completedItems: meta.completed_items || 0,
        estimatedDuration: meta.estimated_duration,
        output: meta.output_data,
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
