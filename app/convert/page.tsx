'use client'

import { useState, useRef } from 'react'
import { Headphones, FileAudio, Loader2, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

type Mode = 'ebook-to-audio' | 'audio-to-ebook'
type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

const VOICES: Record<Voice, string> = {
  alloy: 'Alloy - Neutral',
  echo: 'Echo - Male',
  fable: 'Fable - British',
  onyx: 'Onyx - Deep Male',
  nova: 'Nova - Female',
  shimmer: 'Shimmer - Soft Female'
}

interface ConversionResult {
  title?: string
  voice?: string
  duration?: string
  downloadUrl?: string
  chapters?: number
  wordCount?: number
  format?: string
  storagePath?: string
  fileSize?: number
  chunks?: number
}

export default function ConvertPage() {
  const [mode, setMode] = useState<Mode>('ebook-to-audio')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // eBook to Audio state
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [voice, setVoice] = useState<Voice>('nova')

  // Audio to eBook state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState<'txt' | 'md'>('txt')

  const handleEbookToAudio = async () => {
    if (!text) {
      toast.error('Please enter text to convert')
      return
    }

    setLoading(true)
    setResult(null)
    setError(null)
    
    const wordCount = text.split(/\s+/).length
    const chunks = Math.ceil(text.length / 4000)
    const estMinutes = Math.ceil(chunks * 15 / 60)
    setProgress(`Processing ${wordCount.toLocaleString()} words (~${estMinutes} min)...`)
    
    toast.info(`Converting ${wordCount.toLocaleString()} words. Please wait...`)

    try {
      const response = await fetch('/api/ebook-to-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          title: title || 'Untitled', 
          voice
        })
      })

      const data = await response.json()
      console.log('API Response:', data)

      if (data.success && data.audiobook) {
        console.log('Setting result:', data.audiobook)
        // Set result with all data
        const newResult: ConversionResult = {
          title: data.audiobook.title,
          voice: data.audiobook.voice,
          duration: data.audiobook.duration,
          downloadUrl: data.audiobook.downloadUrl,
          storagePath: data.audiobook.storagePath,
          fileSize: data.audiobook.fileSize,
          chunks: data.audiobook.chunks
        }
        setResult(newResult)
        setLoading(false)
        setProgress('')
        toast.success('Audiobook created successfully!')
      } else {
        setError(data.error || 'Conversion failed')
        setLoading(false)
        setProgress('')
        toast.error(data.error || 'Conversion failed')
      }
    } catch (err: any) {
      console.error('Conversion error:', err)
      setError(err.message || 'Failed to convert')
      setLoading(false)
      setProgress('')
      toast.error('Failed to convert: ' + err.message)
    }
  }

  const handleAudioToEbook = async () => {
    if (!audioFile) {
      toast.error('Please select an audio file')
      return
    }

    setLoading(true)
    setResult(null)
    setError(null)
    setProgress('Uploading and transcribing audio...')

    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('title', title || audioFile.name.replace(/\.[^/.]+$/, ''))
      formData.append('format', outputFormat)

      const response = await fetch('/api/audio-to-ebook', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success && data.ebook) {
        setResult(data.ebook)
        toast.success('eBook created!')
      } else {
        setError(data.error || 'Transcription failed')
        toast.error(data.error || 'Transcription failed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to transcribe')
      toast.error('Failed to transcribe')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const resetForm = () => {
    setResult(null)
    setError(null)
    setText('')
    setTitle('')
    setAudioFile(null)
  }

  const wordCount = text.split(/\s+/).filter(w => w).length

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Convert Content</h1>
          <p className="text-muted-foreground">
            Convert eBooks to audiobooks or transcribe audio to text
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => { setMode('ebook-to-audio'); resetForm() }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'ebook-to-audio' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <Headphones className="h-5 w-5" />
            eBook → Audiobook
          </button>
          <button
            onClick={() => { setMode('audio-to-ebook'); resetForm() }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'audio-to-ebook' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <FileAudio className="h-5 w-5" />
            Audiobook → eBook
          </button>
        </div>

        {/* SUCCESS RESULT - PROMINENT DISPLAY */}
        {result && result.downloadUrl && (
          <div className="mb-8 bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <h3 className="text-xl font-bold text-green-700 dark:text-green-300">
                🎉 Conversion Complete!
              </h3>
            </div>
            
            <div className="space-y-4">
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-white dark:bg-gray-900 rounded-lg p-4">
                {result.title && (
                  <div>
                    <span className="text-muted-foreground">Title:</span>
                    <span className="ml-2 font-medium">{result.title}</span>
                  </div>
                )}
                {result.voice && (
                  <div>
                    <span className="text-muted-foreground">Voice:</span>
                    <span className="ml-2 font-medium">{result.voice}</span>
                  </div>
                )}
                {result.duration && (
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-2 font-medium">{result.duration}</span>
                  </div>
                )}
                {result.chunks && (
                  <div>
                    <span className="text-muted-foreground">Chunks:</span>
                    <span className="ml-2 font-medium">{result.chunks}</span>
                  </div>
                )}
                {result.fileSize && (
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <span className="ml-2 font-medium">{(result.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                )}
              </div>
              
              {/* Download Section */}
              <div className="bg-green-100 dark:bg-green-900 rounded-lg p-4">
                <p className="text-sm font-medium mb-3 text-green-800 dark:text-green-200">
                  Your audiobook is ready! Click below to download:
                </p>
                <div className="flex gap-4 items-center flex-wrap">
                  <a
                    href={result.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 shadow-md"
                  >
                    <Download className="h-6 w-6" />
                    DOWNLOAD AUDIOBOOK
                  </a>
                </div>
                
                {/* Audio Player */}
                {mode === 'ebook-to-audio' && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Or listen here:</p>
                    <audio 
                      controls 
                      src={result.downloadUrl} 
                      className="w-full"
                      preload="metadata"
                    />
                  </div>
                )}
                
                {/* Direct Link */}
                <div className="mt-4 p-2 bg-white dark:bg-gray-800 rounded text-xs break-all">
                  <span className="text-muted-foreground">Direct URL: </span>
                  <a href={result.downloadUrl} className="text-blue-500 hover:underline">
                    {result.downloadUrl}
                  </a>
                </div>
              </div>
              
              {/* New Conversion Button */}
              <button
                onClick={resetForm}
                className="w-full py-3 border-2 border-green-500 text-green-600 rounded-lg font-medium hover:bg-green-50"
              >
                Start New Conversion
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold">Error</h3>
            </div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mb-8 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              <div>
                <h3 className="font-semibold">Processing...</h3>
                {progress && <p className="text-sm text-muted-foreground">{progress}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  This may take several minutes for longer texts. Please don't close this page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Forms - Only show when no result */}
        {!result && (
          <>
            {/* eBook to Audio Form */}
            {mode === 'ebook-to-audio' && (
              <div className="bg-card border rounded-xl p-8">
                <h2 className="text-xl font-bold mb-6">Convert eBook to Audiobook</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title (optional)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title for your audiobook"
                      className="w-full px-4 py-3 border rounded-lg bg-background"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Text Content</label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Paste your eBook text here..."
                      rows={12}
                      className="w-full px-4 py-3 border rounded-lg bg-background resize-y"
                      disabled={loading}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {wordCount.toLocaleString()} words
                      {wordCount > 0 && ` • Est. ${Math.ceil(wordCount / 150)} min audio`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Voice</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {(Object.entries(VOICES) as [Voice, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setVoice(key)}
                          disabled={loading}
                          className={`px-4 py-3 rounded-lg border transition-all ${
                            voice === key 
                              ? 'border-primary bg-primary/10 text-primary' 
                              : 'hover:border-primary/50'
                          } disabled:opacity-50`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleEbookToAudio}
                    disabled={loading || !text}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <Headphones className="h-5 w-5" />
                        Convert to Audiobook (100 credits)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Audio to eBook Form */}
            {mode === 'audio-to-ebook' && (
              <div className="bg-card border rounded-xl p-8">
                <h2 className="text-xl font-bold mb-6">Convert Audiobook to eBook</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title (optional)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter title for the transcribed book"
                      className="w-full px-4 py-3 border rounded-lg bg-background"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Audio File</label>
                    <div
                      onClick={() => !loading && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors ${loading ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                        accept="audio/*"
                        className="hidden"
                        disabled={loading}
                      />
                      {audioFile ? (
                        <div>
                          <FileAudio className="h-12 w-12 mx-auto mb-3 text-primary" />
                          <p className="font-medium">{audioFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">Click to upload audio file</p>
                          <p className="text-sm text-muted-foreground mt-1">MP3, WAV, M4A up to 25MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Output Format</label>
                    <div className="flex gap-3">
                      {(['txt', 'md'] as const).map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => setOutputFormat(fmt)}
                          disabled={loading}
                          className={`flex-1 px-4 py-2 rounded-lg border transition-all uppercase ${
                            outputFormat === fmt 
                              ? 'border-primary bg-primary/10 text-primary' 
                              : 'hover:border-primary/50'
                          } disabled:opacity-50`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleAudioToEbook}
                    disabled={loading || !audioFile}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        <FileAudio className="h-5 w-5" />
                        Transcribe to eBook (75 credits)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
