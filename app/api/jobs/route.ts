// GET /api/jobs - List jobs
// Adapted for existing conversion_jobs table

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabaseAdmin
      .from('conversion_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: jobs, error } = await query

    if (error) {
      console.error('Failed to list jobs:', error)
      return NextResponse.json({ error: 'Failed to list jobs' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      jobs: jobs.map(job => {
        let meta: any = {}
        try {
          meta = JSON.parse(job.output_path || '{}')
        } catch {}

        return {
          id: job.id,
          type: job.source_type,
          status: job.status,
          progress: job.progress || 0,
          currentStep: meta.current_step,
          totalItems: meta.total_items,
          completedItems: meta.completed_items,
          output: meta.output_data,
          error: job.error_message,
          createdAt: job.created_at,
          completedAt: job.completed_at
        }
      }),
      total: jobs.length
    })

  } catch (error) {
    console.error('List jobs error:', error)
    return NextResponse.json({ error: 'Failed to list jobs' }, { status: 500 })
  }
}
