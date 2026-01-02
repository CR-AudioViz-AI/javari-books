'use client'

import { useState, useRef } from 'react'
import { Headphones, FileAudio, Loader2, Download, Upload, Play } from 'lucide-react'
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

export default function ConvertPage() {
  const [mode, setMode] = useState<Mode>('ebook-to-audio')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // eBook to Audio state
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [voice, setVoice] = useState<Voice>('nova')

  // Audio to eBook state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState<'docx' | 'txt' | 'md'>('docx')

  const handleEbookToAudio = async () => {
    if (!text) {
      toast.error('Please enter text to convert')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/ebook-to-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title: title || 'Untitled', voice })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.audiobook)
        toast.success('Audiobook created!')
      } else {
        toast.error(data.error || 'Conversion failed')
      }
    } catch (error) {
      toast.error('Failed to convert to audiobook')
    } finally {
      setLoading(false)
    }
  }

  const handleAudioToEbook = async () => {
    if (!audioFile) {
      toast.error('Please select an audio file')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('title', title || audioFile.name.replace(/\.[^.]+$/, ''))
      formData.append('format', outputFormat)

      const response = await fetch('/api/audio-to-ebook', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.ebook)
        toast.success('eBook created from audio!')
      } else {
        toast.error(data.error || 'Transcription failed')
      }
    } catch (error) {
      toast.error('Failed to transcribe audio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Convert</h1>
          <p className="text-muted-foreground">Transform between eBooks and audiobooks</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => { setMode('ebook-to-audio'); setResult(null) }}
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
            onClick={() => { setMode('audio-to-ebook'); setResult(null) }}
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

        {mode === 'ebook-to-audio' ? (
          <div className="bg-card border rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Audiobook"
                  className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Text Content</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your book content here..."
                  rows={10}
                  className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {text.split(/\s+/).filter(w => w).length.toLocaleString()} words
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Voice</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.entries(VOICES) as [Voice, string][]).map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => setVoice(id)}
                      className={`px-4 py-3 rounded-lg border transition-all text-left ${
                        voice === id 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'hover:border-primary/50'
                      }`}
                    >
                      {name}
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
        ) : (
          <div className="bg-card border rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Transcribed Book"
                  className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Audio File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 px-6 py-12 border-2 border-dashed rounded-lg hover:border-primary transition-colors"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  {audioFile ? (
                    <span className="text-primary font-medium">{audioFile.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Click to upload audio (MP3, WAV, M4A)</span>
                  )}
                </button>
                <p className="text-sm text-muted-foreground mt-1">Max file size: 25MB</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Output Format</label>
                <div className="flex gap-3">
                  {(['docx', 'txt', 'md'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setOutputFormat(fmt)}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-all uppercase ${
                        outputFormat === fmt 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'hover:border-primary/50'
                      }`}
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

        {/* Results */}
        {result && (
          <div className="mt-8 bg-card border rounded-xl p-8">
            <h2 className="text-xl font-bold mb-4">
              {mode === 'ebook-to-audio' ? '🎧 Audiobook Ready' : '📚 eBook Ready'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Title:</span> {result.title}</div>
                {result.voice && <div><span className="text-muted-foreground">Voice:</span> {result.voice}</div>}
                {result.duration && <div><span className="text-muted-foreground">Duration:</span> {result.duration}</div>}
                {result.chapters && <div><span className="text-muted-foreground">Chapters:</span> {result.chapters}</div>}
                {result.wordCount && <div><span className="text-muted-foreground">Words:</span> {result.wordCount.toLocaleString()}</div>}
              </div>

              <div className="flex gap-4">
                <a
                  href={result.downloadUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
                {mode === 'ebook-to-audio' && (
                  <audio controls src={result.downloadUrl} className="flex-1" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
