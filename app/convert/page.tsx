'use client'

import { useState, useRef, useEffect } from 'react'
import { Headphones, FileAudio, Loader2, Download, Upload, CheckCircle, AlertCircle, LogIn, Coins } from 'lucide-react'
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

const CREDIT_COSTS = {
  EBOOK_TO_AUDIO: 100,
  AUDIO_TO_EBOOK: 75
}

interface ConversionResult {
  title?: string
  voice?: string
  duration?: string
  downloadUrl?: string
  chapters?: number
  wordCount?: number
  format?: string
}

export default function ConvertPage() {
  const [mode, setMode] = useState<Mode>('ebook-to-audio')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')
  const [debugLog, setDebugLog] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // eBook to Audio state
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [voice, setVoice] = useState<Voice>('nova')

  // Audio to eBook state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState<'docx' | 'txt' | 'md'>('txt')

  const addLog = (msg: string) => {
    console.log(`[Convert] ${msg}`)
    setDebugLog(prev => [...prev.slice(-10), `${new Date().toISOString()}: ${msg}`])
  }

  const handleEbookToAudio = async () => {
    if (!text) {
      toast.error('Please enter text to convert')
      return
    }

    setLoading(true)
    setResult(null)
    setError(null)
    setDebugLog([])
    
    const wordCount = text.split(/\s+/).length
    const chunks = Math.ceil(text.length / 4000)
    const estMinutes = Math.ceil(chunks * 15 / 60)
    setProgress(`Processing ${wordCount.toLocaleString()} words (~${estMinutes} min)...`)
    
    addLog(`Starting conversion: ${wordCount} words, ${chunks} chunks`)
    toast.info(`Starting conversion. Est. ${estMinutes}-${estMinutes+2} minutes.`)

    try {
      addLog('Making fetch request to /api/ebook-to-audio...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        addLog('Client timeout triggered at 5 minutes')
        controller.abort()
      }, 300000)

      const response = await fetch('/api/ebook-to-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          title: title || 'Untitled', 
          voice
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      addLog(`Response received: status=${response.status}`)
      
      const responseText = await response.text()
      addLog(`Response body length: ${responseText.length}`)
      
      let data
      try {
        data = JSON.parse(responseText)
        addLog(`Parsed JSON: success=${data.success}, hasAudiobook=${!!data.audiobook}`)
      } catch (parseErr) {
        addLog(`JSON parse error: ${parseErr}`)
        addLog(`Raw response: ${responseText.substring(0, 200)}`)
        throw new Error('Invalid JSON response')
      }

      if (data.success && data.audiobook) {
        addLog(`SUCCESS! URL: ${data.audiobook.downloadUrl}`)
        setResult(data.audiobook)
        toast.success('Audiobook created!')
      } else {
        addLog(`API returned error: ${data.error}`)
        setError(data.error || 'Conversion failed')
        toast.error(data.error || 'Conversion failed')
      }
    } catch (err: any) {
      addLog(`Catch block: ${err.name} - ${err.message}`)
      if (err.name === 'AbortError') {
        setError('Request timed out after 5 minutes.')
        toast.error('Request timed out')
      } else {
        setError(err.message || 'Failed to convert')
        toast.error('Failed to convert')
      }
    } finally {
      setLoading(false)
      setProgress('')
      addLog('Conversion attempt finished')
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

  const wordCount = text.split(/\s+/).filter(w => w).length
  const currentCost = mode === 'ebook-to-audio' ? CREDIT_COSTS.EBOOK_TO_AUDIO : CREDIT_COSTS.AUDIO_TO_EBOOK

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
            onClick={() => { setMode('ebook-to-audio'); setResult(null); setError(null) }}
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
            onClick={() => { setMode('audio-to-ebook'); setResult(null); setError(null) }}
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

        {/* Debug Log */}
        {debugLog.length > 0 && (
          <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs font-mono max-h-40 overflow-auto">
            <strong>Debug Log:</strong>
            {debugLog.map((log, i) => (
              <div key={i} className="text-gray-600 dark:text-gray-400">{log}</div>
            ))}
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="mb-8 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h3 className="text-lg font-semibold">Conversion Complete!</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {result.title && <div><span className="text-muted-foreground">Title:</span> {result.title}</div>}
                {result.voice && <div><span className="text-muted-foreground">Voice:</span> {result.voice}</div>}
                {result.duration && <div><span className="text-muted-foreground">Duration:</span> {result.duration}</div>}
                {result.chapters && <div><span className="text-muted-foreground">Chapters:</span> {result.chapters}</div>}
                {result.wordCount && <div><span className="text-muted-foreground">Words:</span> {result.wordCount.toLocaleString()}</div>}
              </div>
              
              {result.downloadUrl && (
                <div className="flex gap-4 items-center flex-wrap">
                  <a
                    href={result.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                  
                  {mode === 'ebook-to-audio' && (
                    <audio controls src={result.downloadUrl} className="flex-1 min-w-[200px]" />
                  )}
                </div>
              )}
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
              </div>
            </div>
          </div>
        )}

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
                    Convert to Audiobook ({CREDIT_COSTS.EBOOK_TO_AUDIO} credits)
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
                    Transcribe to eBook ({CREDIT_COSTS.AUDIO_TO_EBOOK} credits)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
