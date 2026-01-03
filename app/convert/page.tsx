'use client'

import { useState, useRef, useEffect } from 'react'
import { Headphones, FileAudio, Loader2, Download, Upload, Play, CheckCircle, XCircle, Clock, RefreshCw, List } from 'lucide-react'
import { toast } from 'sonner'

type Mode = 'ebook-to-audio' | 'audio-to-ebook'
type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'

const VOICES: Record<Voice, string> = {
  alloy: 'Alloy - Neutral',
  echo: 'Echo - Male',
  fable: 'Fable - British',
  onyx: 'Onyx - Deep Male',
  nova: 'Nova - Female',
  shimmer: 'Shimmer - Soft Female'
}

interface Job {
  id: string
  type: string
  status: JobStatus
  progress: number
  currentStep: string
  totalItems: number
  completedItems: number
  estimatedDuration?: string
  output?: {
    title?: string
    downloadUrl?: string
    duration?: string
    voice?: string
    chapters?: number
    wordCount?: number
    results?: Array<{ title: string; status: string; downloadUrl?: string; error?: string }>
  }
  error?: string
  createdAt: string
  completedAt?: string
}

export default function ConvertPage() {
  const [mode, setMode] = useState<Mode>('ebook-to-audio')
  const [loading, setLoading] = useState(false)
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [showJobHistory, setShowJobHistory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // eBook to Audio state
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [voice, setVoice] = useState<Voice>('nova')

  // Audio to eBook state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState<'docx' | 'txt' | 'md'>('docx')

  // Bulk mode state
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkTexts, setBulkTexts] = useState<Array<{ title: string; text: string }>>([{ title: '', text: '' }])

  // Load recent jobs on mount
  useEffect(() => {
    loadRecentJobs()
  }, [])

  // Poll for active job status
  useEffect(() => {
    if (activeJob && ['queued', 'processing'].includes(activeJob.status)) {
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(activeJob.id)
      }, 2000) // Poll every 2 seconds
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [activeJob?.id, activeJob?.status])

  const loadRecentJobs = async () => {
    try {
      const response = await fetch('/api/jobs?limit=10')
      const data = await response.json()
      if (data.success) {
        setRecentJobs(data.jobs)
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`)
      const data = await response.json()
      
      if (data.success) {
        setActiveJob(data.job)
        
        if (data.job.status === 'completed') {
          toast.success('Conversion complete!')
          loadRecentJobs()
        } else if (data.job.status === 'failed') {
          toast.error(data.job.error || 'Conversion failed')
          loadRecentJobs()
        }
      }
    } catch (error) {
      console.error('Failed to poll job:', error)
    }
  }

  const handleEbookToAudio = async () => {
    if (bulkMode) {
      const validBooks = bulkTexts.filter(b => b.title && b.text)
      if (validBooks.length === 0) {
        toast.error('Please add at least one book with title and text')
        return
      }
      await createJob('bulk-convert', { books: validBooks, voice })
    } else {
      if (!text) {
        toast.error('Please enter text to convert')
        return
      }
      await createJob('ebook-to-audio', { text, title: title || 'Untitled', voice })
    }
  }

  const handleAudioToEbook = async () => {
    if (!audioFile) {
      toast.error('Please select an audio file')
      return
    }

    // For audio files, we need to upload first then process
    // For now, create a data URL (limited to smaller files)
    const reader = new FileReader()
    reader.onload = async () => {
      const audioUrl = reader.result as string
      await createJob('audio-to-ebook', { 
        audioUrl, 
        title: title || audioFile.name.replace(/\.[^/.]+$/, ''),
        format: outputFormat 
      })
    }
    reader.readAsDataURL(audioFile)
  }

  const createJob = async (type: string, input: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, input })
      })

      const data = await response.json()

      if (data.success) {
        setActiveJob(data.job)
        toast.success(`Job created! ${data.job.estimatedDuration}`)
      } else {
        toast.error(data.error || 'Failed to create job')
      }
    } catch (error) {
      toast.error('Failed to start conversion')
    } finally {
      setLoading(false)
    }
  }

  const addBulkItem = () => {
    setBulkTexts([...bulkTexts, { title: '', text: '' }])
  }

  const updateBulkItem = (index: number, field: 'title' | 'text', value: string) => {
    const updated = [...bulkTexts]
    updated[index][field] = value
    setBulkTexts(updated)
  }

  const removeBulkItem = (index: number) => {
    if (bulkTexts.length > 1) {
      setBulkTexts(bulkTexts.filter((_, i) => i !== index))
    }
  }

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />
      case 'processing': return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default: return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const wordCount = text.split(/\s+/).filter(w => w).length

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Convert Content</h1>
          <p className="text-muted-foreground">
            Convert eBooks to audiobooks or transcribe audio to text.
            <br />
            <span className="text-sm">Supports any length - processing happens in the background!</span>
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => { setMode('ebook-to-audio'); setActiveJob(null) }}
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
            onClick={() => { setMode('audio-to-ebook'); setActiveJob(null) }}
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

        {/* Active Job Progress */}
        {activeJob && ['queued', 'processing'].includes(activeJob.status) && (
          <div className="mb-8 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              <h3 className="text-lg font-semibold">Processing...</h3>
              {activeJob.estimatedDuration && (
                <span className="text-sm text-muted-foreground">
                  Est. {activeJob.estimatedDuration}
                </span>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-4 mb-3">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${activeJob.progress || 0}%` }}
              />
            </div>
            
            <div className="flex justify-between text-sm">
              <span>{activeJob.currentStep || 'Starting...'}</span>
              <span>{activeJob.progress || 0}%</span>
            </div>
            
            {activeJob.totalItems > 1 && (
              <p className="text-sm text-muted-foreground mt-2">
                {activeJob.completedItems} of {activeJob.totalItems} items complete
              </p>
            )}
          </div>
        )}

        {/* Completed Job Result */}
        {activeJob && activeJob.status === 'completed' && activeJob.output && (
          <div className="mb-8 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h3 className="text-lg font-semibold">Conversion Complete!</h3>
            </div>
            
            {activeJob.output.downloadUrl && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Title:</span> {activeJob.output.title}</div>
                  {activeJob.output.voice && <div><span className="text-muted-foreground">Voice:</span> {activeJob.output.voice}</div>}
                  {activeJob.output.duration && <div><span className="text-muted-foreground">Duration:</span> {activeJob.output.duration}</div>}
                  {activeJob.output.chapters && <div><span className="text-muted-foreground">Chapters:</span> {activeJob.output.chapters}</div>}
                </div>
                
                <div className="flex gap-4 items-center">
                  <a
                    href={activeJob.output.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                  
                  {mode === 'ebook-to-audio' && (
                    <audio controls src={activeJob.output.downloadUrl} className="flex-1" />
                  )}
                </div>
              </div>
            )}

            {/* Bulk results */}
            {activeJob.output.results && (
              <div className="space-y-2">
                {activeJob.output.results.map((result, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <span className="font-medium">{result.title}</span>
                    {result.status === 'completed' && result.downloadUrl ? (
                      <a
                        href={result.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-500 hover:underline flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    ) : (
                      <span className="text-red-500 text-sm">{result.error || 'Failed'}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setActiveJob(null)}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground"
            >
              Start new conversion
            </button>
          </div>
        )}

        {/* Failed Job */}
        {activeJob && activeJob.status === 'failed' && (
          <div className="mb-8 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold">Conversion Failed</h3>
            </div>
            <p className="text-red-600 dark:text-red-400">{activeJob.error || 'Unknown error'}</p>
            <button
              onClick={() => setActiveJob(null)}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground"
            >
              Try again
            </button>
          </div>
        )}

        {/* Input Forms - only show when no active job */}
        {(!activeJob || ['completed', 'failed'].includes(activeJob.status)) && (
          <>
            {/* eBook to Audio */}
            {mode === 'ebook-to-audio' && (
              <div className="bg-card border rounded-xl p-8">
                {/* Bulk mode toggle */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">
                    {bulkMode ? 'Bulk Convert Multiple Books' : 'Convert eBook to Audiobook'}
                  </h2>
                  <button
                    onClick={() => setBulkMode(!bulkMode)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      bulkMode ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    {bulkMode ? 'Single Mode' : 'Bulk Mode'}
                  </button>
                </div>

                {bulkMode ? (
                  <div className="space-y-6">
                    {bulkTexts.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 relative">
                        <button
                          onClick={() => removeBulkItem(index)}
                          className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"
                          disabled={bulkTexts.length === 1}
                        >
                          ×
                        </button>
                        <div className="mb-3">
                          <label className="block text-sm font-medium mb-1">Book {index + 1} Title</label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateBulkItem(index, 'title', e.target.value)}
                            placeholder="Enter book title"
                            className="w-full px-4 py-2 border rounded-lg bg-background"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Text Content</label>
                          <textarea
                            value={item.text}
                            onChange={(e) => updateBulkItem(index, 'text', e.target.value)}
                            placeholder="Paste book text here..."
                            rows={4}
                            className="w-full px-4 py-3 border rounded-lg bg-background resize-y"
                          />
                        </div>
                      </div>
                    ))}
                    
                    <button
                      onClick={addBulkItem}
                      className="w-full py-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      + Add Another Book
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Title (optional)</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter a title for your audiobook"
                        className="w-full px-4 py-3 border rounded-lg bg-background"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Text Content</label>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste your eBook text here... Any length supported!"
                        rows={12}
                        className="w-full px-4 py-3 border rounded-lg bg-background resize-y"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        {wordCount.toLocaleString()} words
                        {wordCount > 0 && ` • Est. ${Math.ceil(wordCount / 150)} min audio`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2">Voice</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(Object.entries(VOICES) as [Voice, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setVoice(key)}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          voice === key 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'hover:border-primary/50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleEbookToAudio}
                  disabled={loading || (bulkMode ? bulkTexts.every(b => !b.text) : !text)}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating Job...
                    </>
                  ) : (
                    <>
                      <Headphones className="h-5 w-5" />
                      {bulkMode 
                        ? `Convert ${bulkTexts.filter(b => b.text).length} Books (${bulkTexts.filter(b => b.text).length * 100} credits)`
                        : 'Convert to Audiobook (100 credits)'
                      }
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Audio to eBook */}
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
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Audio File</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                        accept="audio/*"
                        className="hidden"
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
                          <p className="text-sm text-muted-foreground mt-1">
                            MP3, WAV, M4A up to 25MB
                          </p>
                        </div>
                      )}
                    </div>
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
                        Creating Job...
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

        {/* Job History */}
        <div className="mt-8">
          <button
            onClick={() => setShowJobHistory(!showJobHistory)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <List className="h-4 w-4" />
            {showJobHistory ? 'Hide' : 'Show'} Recent Conversions ({recentJobs.length})
          </button>
          
          {showJobHistory && recentJobs.length > 0 && (
            <div className="mt-4 space-y-2">
              {recentJobs.map(job => (
                <div 
                  key={job.id} 
                  className="flex items-center justify-between p-4 bg-card border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">
                        {job.output?.title || job.type.replace(/-/g, ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(job.createdAt).toLocaleDateString()} • {job.type}
                      </p>
                    </div>
                  </div>
                  
                  {job.status === 'completed' && job.output?.downloadUrl && (
                    <a
                      href={job.output.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  )}
                  
                  {job.status === 'processing' && (
                    <span className="text-sm text-blue-500">
                      {job.progress}% - {job.currentStep}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
