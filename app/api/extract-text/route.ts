import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    let text = ''

    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      text = await file.text()
    } else if (fileName.endsWith('.docx')) {
      // For DOCX, we'll use mammoth.js
      const mammoth = require('mammoth')
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (fileName.endsWith('.pdf')) {
      // For PDF, use pdf-parse
      const pdfParse = require('pdf-parse')
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await pdfParse(buffer)
      text = result.text
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 })
    }

    // Clean up the text
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const wordCount = text.split(/\s+/).filter(w => w).length

    return NextResponse.json({
      success: true,
      text,
      wordCount,
      fileName: file.name
    })

  } catch (error) {
    console.error('Text extraction error:', error)
    return NextResponse.json({ 
      error: 'Failed to extract text',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
