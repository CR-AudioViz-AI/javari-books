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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const title = formData.get('title') as string || 'Untitled'
    const format = formData.get('format') as string || 'txt'
    const userId = formData.get('userId') as string
    const userEmail = formData.get('userEmail') as string
    const saveToLibrary = formData.get('saveToLibrary') === 'true'

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
    }

    console.log(`Transcribing "${title}" for user ${userEmail || userId}`)

    // Convert to buffer for OpenAI
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    
    // Create a File object for OpenAI
    const file = new File([audioBuffer], audioFile.name, { type: audioFile.type })

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text'
    })

    const transcribedText = transcription as unknown as string

    // Format the text
    let formattedText = transcribedText
    const wordCount = transcribedText.split(/\s+/).filter(w => w).length

    // Add markdown formatting if requested
    if (format === 'md') {
      formattedText = `# ${title}\n\n${transcribedText}`
    }

    // Create file content based on format
    let fileContent: Buffer
    let mimeType: string
    let fileExtension: string

    if (format === 'docx') {
      // Create DOCX using docx package
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx')
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_1
            }),
            new Paragraph({ text: '' }),
            ...transcribedText.split('\n\n').map((para: string) => 
              new Paragraph({
                children: [new TextRun(para)]
              })
            )
          ]
        }]
      })

      fileContent = await Packer.toBuffer(doc)
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      fileExtension = 'docx'
    } else {
      fileContent = Buffer.from(formattedText, 'utf-8')
      mimeType = format === 'md' ? 'text/markdown' : 'text/plain'
      fileExtension = format
    }

    // Generate slug and path
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const timestamp = Date.now()
    const ebookPath = userId 
      ? `users/${userId}/ebooks/${slug}-${timestamp}.${fileExtension}`
      : `ebooks/${slug}-${timestamp}.${fileExtension}`

    console.log(`Uploading ${(fileContent.length / 1024).toFixed(2)}KB to ${ebookPath}`)

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('assets')
      .upload(ebookPath, fileContent, {
        contentType: mimeType,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload eBook' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('assets')
      .getPublicUrl(ebookPath)

    let assetId: string | undefined

    // Save to user's library
    if (saveToLibrary && userId) {
      try {
        const { data: assetData, error: assetError } = await supabaseAdmin
          .from('assets')
          .insert({
            name: title,
            slug: `${slug}-${timestamp}`,
            original_filename: `${slug}.${fileExtension}`,
            file_size_bytes: fileContent.length,
            mime_type: mimeType,
            file_extension: fileExtension,
            storage_path: ebookPath,
            owned_by: userId,
            uploaded_by: userId,
            status: 'active',
            is_public: false,
            is_free: false,
            tags: ['ebook', 'transcription', 'javari-books'],
            metadata: {
              format: fileExtension,
              wordCount,
              sourceAudio: audioFile.name,
              sourceSize: audioFile.size,
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
      ebook: {
        title,
        format: fileExtension,
        wordCount,
        downloadUrl: urlData.publicUrl,
        storagePath: ebookPath,
        fileSize: fileContent.length,
        assetId
      }
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ 
      error: 'Failed to transcribe audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    supportedFormats: ['mp3', 'wav', 'm4a', 'ogg', 'webm'],
    outputFormats: ['txt', 'md', 'docx'],
    maxDuration: '300 seconds (Pro plan)',
    model: 'whisper-1',
    savesToLibrary: true
  })
}
