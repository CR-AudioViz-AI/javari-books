import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type Book = {
  id: string
  title: string
  slug: string
  description: string
  category: string
  tags: string[]
  price: number
  is_free: boolean
  storage_path: string
  audio_path?: string
  created_at: string
  word_count?: number
  chapter_count?: number
}
