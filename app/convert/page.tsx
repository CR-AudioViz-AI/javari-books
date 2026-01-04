'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Headphones, FileAudio, Loader2, Download, Upload, CheckCircle, AlertCircle, 
  LogIn, Coins, Library, Crown, FileText, Play, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, Clock, Share2, Settings, Sparkles, Zap, FileUp, X,
  ChevronDown, Info, History, Trash2, Copy, Check
} from 'lucide-react'
import { toast } from 'sonner'
import { CentralAuth, CentralCredits, CentralAnalytics, CentralActivity, CREDIT_COSTS, type User } from '@/lib/central-services'

type Mode = 'ebook-to-audio' | 'audio-to-ebook'
type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
type Quality = 'tts-1' | 'tts-1-hd'

const VOICES: Record<Voice, { label: string; description: string; gender: string }> = {
  alloy: { label: 'Alloy', description: 'Versatile, neutral voice', gender: 'neutral' },
  echo: { label: 'Echo', description: 'Clear, masculine voice', gender: 'male' },
  fable: { label: 'Fable', description: 'British accent, storytelling', gender: 'neutral' },
  onyx: { label: 'Onyx', description: 'Deep, authoritative voice', gender: 'male' },
  nova: { label: 'Nova', description: 'Warm, expressive female voice', gender: 'female' },
  shimmer: { label: 'Shimmer', description: 'Soft, gentle female voice', gender: 'female' }
}

const QUALITY_OPTIONS: Record<Quality, { label: string; credits: number }> = {
  'tts-1': { label: 'Standard', credits: 50 },
  'tts-1-hd': { label: 'HD Quality', credits: 100 }
}

// Admin emails that get free access
const ADMIN_EMAILS = [
  'royhenderson@craudiovizai.com',
  'cindyhenderson@craudiovizai.com'
]

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
  assetId?: string
}

interface RecentConversion {
  id: string
  title: string
  type: 'audiobook' | 'ebook'
  createdAt: string
  downloadUrl: string
}

export default function ConvertPage() {
  // Core state
  const [mode, setMode] = useState<Mode>('ebook-to-audio')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [progressText, setProgressText] = useState<string>('')
  
  // File handling
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  // eBook to Audio state
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [voice, setVoice] = useState<Voice>('nova')
  const [quality, setQuality] = useState<Quality>('tts-1')
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)

  // Audio to eBook state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState<'txt' | 'md' | 'docx'>('txt')

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Recent conversions
  const [recentConversions, setRecentConversions] = useState<RecentConversion[]>([])
  const [showRecent, setShowRecent] = useState(false)

  // Clipboard state
  const [copied, setCopied] = useState(false)

  // Check if user is admin (free access)
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email)

  // Calculate current credit cost
  const currentCost = mode === 'ebook-to-audio' 
    ? (isAdmin ? 0 : QUALITY_OPTIONS[quality].credits)
    : (isAdmin ? 0 : CREDIT_COSTS.AUDIO_TO_EBOOK)

  // Word count and estimated duration
  const wordCount = text.split(/\s+/).filter(w => w).length
  const estimatedMinutes = Math.ceil(wordCount / 150)
  const estimatedDuration = estimatedMinutes >= 60 
    ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
    : `${estimatedMinutes}m`

  // Check auth on mount
  useEffect(() => {
    checkAuth()
    loadRecentConversions()
    CentralAnalytics.pageView('/apps/javari-books')
  }, [])

  const checkAuth = async () => {
    setCheckingAuth(true)
    try {
      const sessionResult = await CentralAuth.getSession()
      if (sessionResult.success && sessionResult.data) {
        setUser(sessionResult.data)
        const creditResult = await CentralCredits.getBalance()
        if (creditResult.success && creditResult.data) {
          setCreditBalance(creditResult.data.balance)
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err)
    } finally {
      setCheckingAuth(false)
    }
  }

  const loadRecentConversions = () => {
    try {
      const saved = localStorage.getItem('javari-books-recent')
      if (saved) {
        setRecentConversions(JSON.parse(saved))
      }
    } catch {}
  }

  const saveToRecent = (conversion: RecentConversion) => {
    const updated = [conversion, ...recentConversions.filter(c => c.id !== conversion.id)].slice(0, 10)
    setRecentConversions(updated)
    localStorage.setItem('javari-books-recent', JSON.stringify(updated))
  }

  const handleLogin = () => {
    window.location.href = CentralAuth.getLoginUrl()
  }

  // File upload handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await processUploadedFile(files[0])
    }
  }, [mode])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await processUploadedFile(files[0])
    }
  }

  const processUploadedFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    
    if (mode === 'ebook-to-audio') {
      if (!['txt', 'md', 'docx', 'pdf'].includes(extension || '')) {
        toast.error('Please upload a TXT, MD, DOCX, or PDF file')
        return
      }
      
      setUploadedFile(file)
      setTitle(file.name.replace(/\.[^/.]+$/, ''))
      
      // Extract text from file
      if (extension === 'txt' || extension === 'md') {
        const content = await file.text()
        setText(content)
        toast.success(`Loaded ${file.name}`)
      } else if (extension === 'docx') {
        // Send to API for DOCX parsing
        setProgressText('Extracting text from document...')
        try {
          const formData = new FormData()
          formData.append('file', file)
          const response = await fetch('/api/extract-text', {
            method: 'POST',
            body: formData
          })
          const data = await response.json()
          if (data.success && data.text) {
            setText(data.text)
            toast.success(`Extracted ${data.wordCount.toLocaleString()} words`)
          } else {
            toast.error('Failed to extract text from document')
          }
        } catch (err) {
          toast.error('Failed to process document')
        }
        setProgressText('')
      }
    } else {
      if (!['mp3', 'wav', 'm4a', 'ogg', 'webm'].includes(extension || '')) {
        toast.error('Please upload an MP3, WAV, M4A, OGG, or WebM audio file')
        return
      }
      setAudioFile(file)
      setTitle(file.name.replace(/\.[^/.]+$/, ''))
      toast.success(`Selected ${file.name}`)
    }
  }

  const handleEbookToAudio = async () => {
    if (!user) {
      toast.error('Please log in to convert')
      handleLogin()
      return
    }

    if (!text) {
      toast.error('Please enter or upload text to convert')
      return
    }

    if (!isAdmin && creditBalance < currentCost) {
      toast.error(`Insufficient credits. Need ${currentCost}, have ${creditBalance}`)
      return
    }

    setLoading(true)
    setResult(null)
    setError(null)
    setProgress(0)
    setProgressText('Preparing conversion...')

    try {
      // Deduct credits first (except for admins)
      if (!isAdmin) {
        setProgressText('Processing payment...')
        const deductResult = await CentralCredits.deduct(currentCost, `Audiobook: ${title || 'Untitled'}`)
        if (!deductResult.success) {
          toast.error('Failed to deduct credits')
          setLoading(false)
          return
        }
        if (deductResult.data) {
          setCreditBalance(deductResult.data.balance)
        }
      }

      CentralActivity.log('ebook_to_audio_started', { 
        title: title || 'Untitled',
        wordCount,
        voice,
        quality,
        isAdmin
      })

      // Calculate chunks for progress
      const chunks = Math.ceil(text.length / 4000)
      setProgressText(`Converting text (0/${chunks} chunks)...`)

      const response = await fetch('/api/ebook-to-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice,
          quality,
          userId: user.id,
          userEmail: user.email,
          title: title || 'Untitled',
          saveToLibrary: true
        })
      })

      const data = await response.json()

      if (data.success && data.audiobook) {
        setResult(data.audiobook)
        setProgress(100)
        setProgressText('Complete!')
        toast.success('Audiobook created and saved to your library!')
        
        // Save to recent
        saveToRecent({
          id: data.audiobook.assetId || Date.now().toString(),
          title: data.audiobook.title,
          type: 'audiobook',
          createdAt: new Date().toISOString(),
          downloadUrl: data.audiobook.downloadUrl
        })

        CentralActivity.log('ebook_to_audio_completed', { 
          title: data.audiobook.title,
          duration: data.audiobook.duration,
          chunks: data.audiobook.chunks,
          assetId: data.audiobook.assetId
        })
      } else {
        // Refund on failure
        if (!isAdmin) {
          await CentralCredits.refund(currentCost, 'Conversion failed')
          await checkAuth()
        }
        setError(data.error || 'Conversion failed')
        toast.error(data.error || 'Conversion failed - credits refunded')
      }
    } catch (err: any) {
      if (!isAdmin) {
        await CentralCredits.refund(currentCost, `Error: ${err.message}`)
        await checkAuth()
      }
      setError(err.message || 'Failed to convert')
      toast.error('Failed to convert' + (isAdmin ? '' : ' - credits refunded'))
    } finally {
      setLoading(false)
      setProgressText('')
    }
  }

  const handleAudioToEbook = async () => {
    if (!user) {
      toast.error('Please log in to transcribe')
      handleLogin()
      return
    }

    if (!audioFile) {
      toast.error('Please select an audio file')
      return
    }

    const creditCost = isAdmin ? 0 : CREDIT_COSTS.AUDIO_TO_EBOOK

    if (!isAdmin && creditBalance < creditCost) {
      toast.error(`Insufficient credits. Need ${creditCost}, have ${creditBalance}`)
      return
    }

    setLoading(true)
    setResult(null)
    setError(null)
    setProgress(0)
    setProgressText('Uploading audio file...')

    try {
      if (!isAdmin) {
        const deductResult = await CentralCredits.deduct(creditCost, `Transcription: ${title || audioFile.name}`)
        if (!deductResult.success) {
          toast.error('Failed to deduct credits')
          setLoading(false)
          return
        }
        if (deductResult.data) {
          setCreditBalance(deductResult.data.balance)
        }
      }

      CentralActivity.log('audio_to_ebook_started', { 
        title: title || audioFile.name,
        fileSize: audioFile.size,
        isAdmin
      })

      setProgress(20)
      setProgressText('Transcribing audio...')

      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('title', title || audioFile.name.replace(/\.[^/.]+$/, ''))
      formData.append('format', outputFormat)
      formData.append('userId', user.id)
      formData.append('userEmail', user.email)
      formData.append('saveToLibrary', 'true')

      const response = await fetch('/api/audio-to-ebook', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success && data.ebook) {
        setResult(data.ebook)
        setProgress(100)
        setProgressText('Complete!')
        toast.success('eBook created and saved to your library!')
        
        saveToRecent({
          id: data.ebook.assetId || Date.now().toString(),
          title: data.ebook.title,
          type: 'ebook',
          createdAt: new Date().toISOString(),
          downloadUrl: data.ebook.downloadUrl
        })

        CentralActivity.log('audio_to_ebook_completed', { 
          title: data.ebook.title,
          wordCount: data.ebook.wordCount,
          assetId: data.ebook.assetId
        })
      } else {
        if (!isAdmin) {
          await CentralCredits.refund(creditCost, 'Transcription failed')
          await checkAuth()
        }
        setError(data.error || 'Transcription failed')
        toast.error(data.error || 'Transcription failed - credits refunded')
      }
    } catch (err: any) {
      if (!isAdmin) {
        await CentralCredits.refund(CREDIT_COSTS.AUDIO_TO_EBOOK, `Error: ${err.message}`)
        await checkAuth()
      }
      setError(err.message || 'Failed to transcribe')
      toast.error('Failed to transcribe' + (isAdmin ? '' : ' - credits refunded'))
    } finally {
      setLoading(false)
      setProgressText('')
    }
  }

  // Audio player controls
  const togglePlayback = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const changeSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % speeds.length
    const newSpeed = speeds[nextIndex]
    setPlaybackSpeed(newSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted
      setVolume(audioRef.current.muted ? 0 : 1)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => {
    setResult(null)
    setError(null)
    setText('')
    setTitle('')
    setAudioFile(null)
    setUploadedFile(null)
    setProgress(0)
    setProgressText('')
  }

  // Loading auth state
  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-amber-500 animate-pulse" />
          </div>
          <p className="text-muted-foreground mt-4">Loading Javari Books...</p>
        </div>
      </main>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="bg-card border rounded-2xl p-8 text-center shadow-xl">
            <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
              <LogIn className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Welcome to Javari Books</h1>
            <p className="text-muted-foreground mb-6">
              Transform your eBooks into professional audiobooks, or transcribe audio into text. Sign in to get started.
            </p>
            <button
              onClick={handleLogin}
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all transform hover:scale-[1.02]"
            >
              <LogIn className="h-5 w-5" />
              Sign In to Continue
            </button>
            <p className="text-sm text-muted-foreground mt-4">
              Don't have an account?{' '}
              <a href="https://craudiovizai.com/signup" className="text-primary hover:underline font-medium">
                Sign up free
              </a>
            </p>
            
            {/* Features preview */}
            <div className="mt-8 pt-8 border-t">
              <p className="text-sm font-medium mb-4">What you can do:</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Headphones className="h-4 w-4 text-primary" />
                  eBook to Audio
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  Audio to Text
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Settings className="h-4 w-4 text-primary" />
                  6 Voice Options
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Library className="h-4 w-4 text-primary" />
                  Personal Library
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Javari Books
              </span>
              {isAdmin && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                  <Crown className="h-3 w-3" />
                  Admin
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Convert eBooks to audiobooks or transcribe audio to text
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-card border rounded-xl">
              <Coins className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg">{isAdmin ? '∞' : creditBalance.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">credits</span>
            </div>
            <a 
              href="/library" 
              className="flex items-center gap-2 px-4 py-2 bg-card border rounded-xl hover:bg-muted transition-colors"
            >
              <Library className="h-5 w-5" />
              <span className="hidden sm:inline">Library</span>
            </a>
            <button
              onClick={() => setShowRecent(!showRecent)}
              className="flex items-center gap-2 px-4 py-2 bg-card border rounded-xl hover:bg-muted transition-colors"
            >
              <History className="h-5 w-5" />
              <span className="hidden sm:inline">Recent</span>
            </button>
          </div>
        </div>

        {/* Recent Conversions Panel */}
        {showRecent && recentConversions.length > 0 && (
          <div className="mb-6 bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Conversions
            </h3>
            <div className="space-y-2">
              {recentConversions.slice(0, 5).map((conv) => (
                <div key={conv.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {conv.type === 'audiobook' ? (
                      <Headphones className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                    <span className="text-sm font-medium truncate max-w-[200px]">{conv.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <a
                    href={conv.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insufficient Credits Warning */}
        {!isAdmin && creditBalance < currentCost && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Insufficient Credits</p>
                <p className="text-sm text-muted-foreground">
                  This conversion requires {currentCost} credits. You have {creditBalance}.
                </p>
              </div>
              <a 
                href="https://craudiovizai.com/credits" 
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                Buy Credits
              </a>
            </div>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-muted p-1 rounded-xl">
            <button
              onClick={() => { setMode('ebook-to-audio'); resetForm() }}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                mode === 'ebook-to-audio' 
                  ? 'bg-primary text-primary-foreground shadow-lg' 
                  : 'hover:bg-background/50'
              }`}
            >
              <Headphones className="h-5 w-5" />
              eBook → Audio
              {!isAdmin && (
                <span className="text-xs opacity-75 bg-white/20 px-2 py-0.5 rounded-full">
                  {QUALITY_OPTIONS[quality].credits} cr
                </span>
              )}
            </button>
            <button
              onClick={() => { setMode('audio-to-ebook'); resetForm() }}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                mode === 'audio-to-ebook' 
                  ? 'bg-primary text-primary-foreground shadow-lg' 
                  : 'hover:bg-background/50'
              }`}
            >
              <FileAudio className="h-5 w-5" />
              Audio → eBook
              {!isAdmin && (
                <span className="text-xs opacity-75 bg-white/20 px-2 py-0.5 rounded-full">
                  {CREDIT_COSTS.AUDIO_TO_EBOOK} cr
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-card border rounded-2xl p-6 shadow-lg">
          {/* eBook to Audio Mode */}
          {mode === 'ebook-to-audio' && !result && (
            <div className="space-y-6">
              {/* File Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.docx,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileUp className={`h-12 w-12 mx-auto mb-4 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-medium mb-1">
                  {uploadedFile ? uploadedFile.name : 'Drop your file here or click to upload'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports TXT, MD, DOCX, PDF
                </p>
                {uploadedFile && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setText(''); }}
                    className="mt-3 text-sm text-red-500 hover:underline flex items-center gap-1 mx-auto"
                  >
                    <X className="h-3 w-3" /> Remove file
                  </button>
                )}
              </div>

              {/* Or Paste Text */}
              <div className="relative">
                <div className="absolute left-4 top-3 text-xs text-muted-foreground">
                  Or paste your text directly:
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your eBook content here..."
                  className="w-full h-48 pt-8 px-4 pb-4 border rounded-xl resize-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{wordCount.toLocaleString()} words</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{estimatedDuration}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter audiobook title..."
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                />
              </div>

              {/* Voice & Quality Selection */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Voice Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Voice</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                      className="w-full flex items-center justify-between px-4 py-3 border rounded-xl bg-background hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Volume2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{VOICES[voice].label}</p>
                          <p className="text-xs text-muted-foreground">{VOICES[voice].description}</p>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showVoiceSelector ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showVoiceSelector && (
                      <div className="absolute z-10 w-full mt-2 bg-card border rounded-xl shadow-xl overflow-hidden">
                        {Object.entries(VOICES).map(([key, val]) => (
                          <button
                            key={key}
                            onClick={() => { setVoice(key as Voice); setShowVoiceSelector(false) }}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors ${
                              voice === key ? 'bg-primary/10' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Volume2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{val.label}</p>
                              <p className="text-xs text-muted-foreground">{val.description}</p>
                            </div>
                            {voice === key && (
                              <Check className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quality Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Quality</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(QUALITY_OPTIONS).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setQuality(key as Quality)}
                        className={`px-4 py-3 border rounded-xl transition-all ${
                          quality === key 
                            ? 'border-primary bg-primary/10 ring-2 ring-primary' 
                            : 'hover:border-primary/50 hover:bg-muted'
                        }`}
                      >
                        <p className="font-medium">{val.label}</p>
                        {!isAdmin && (
                          <p className="text-xs text-muted-foreground">{val.credits} credits</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Convert Button */}
              <button
                onClick={handleEbookToAudio}
                disabled={loading || !text || (!isAdmin && creditBalance < currentCost)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {progressText || 'Converting...'}
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Convert to Audiobook
                    {!isAdmin && <span className="opacity-75">({currentCost} credits)</span>}
                  </>
                )}
              </button>

              {/* Progress Bar */}
              {loading && progress > 0 && (
                <div className="space-y-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">{progressText}</p>
                </div>
              )}
            </div>
          )}

          {/* Audio to eBook Mode */}
          {mode === 'audio-to-ebook' && !result && (
            <div className="space-y-6">
              {/* Audio Upload */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => audioInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver 
                    ? 'border-primary bg-primary/5' 
                    : audioFile 
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {audioFile ? (
                  <>
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="font-medium mb-1">{audioFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAudioFile(null) }}
                      className="mt-3 text-sm text-red-500 hover:underline flex items-center gap-1 mx-auto"
                    >
                      <X className="h-3 w-3" /> Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <FileAudio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium mb-1">Drop your audio file here or click to upload</p>
                    <p className="text-sm text-muted-foreground">
                      Supports MP3, WAV, M4A, OGG, WebM
                    </p>
                  </>
                )}
              </div>

              {/* Title & Format */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter eBook title..."
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Output Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['txt', 'md', 'docx'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setOutputFormat(fmt)}
                        className={`px-4 py-3 border rounded-xl font-medium uppercase transition-all ${
                          outputFormat === fmt 
                            ? 'border-primary bg-primary/10 ring-2 ring-primary' 
                            : 'hover:border-primary/50 hover:bg-muted'
                        }`}
                      >
                        .{fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transcribe Button */}
              <button
                onClick={handleAudioToEbook}
                disabled={loading || !audioFile || (!isAdmin && creditBalance < CREDIT_COSTS.AUDIO_TO_EBOOK)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {progressText || 'Transcribing...'}
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Transcribe to eBook
                    {!isAdmin && <span className="opacity-75">({CREDIT_COSTS.AUDIO_TO_EBOOK} credits)</span>}
                  </>
                )}
              </button>

              {/* Progress Bar */}
              {loading && progress > 0 && (
                <div className="space-y-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">{progressText}</p>
                </div>
              )}
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-6">
              {/* Success Header */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {mode === 'ebook-to-audio' ? 'Audiobook Created!' : 'eBook Created!'}
                </h2>
                <p className="text-muted-foreground">
                  Your file has been saved to your library
                </p>
              </div>

              {/* File Info Card */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {mode === 'ebook-to-audio' ? (
                      <Headphones className="h-6 w-6 text-primary" />
                    ) : (
                      <FileText className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{result.title}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      {result.voice && <span>Voice: {result.voice}</span>}
                      {result.duration && <span>Duration: {result.duration}</span>}
                      {result.wordCount && <span>{result.wordCount.toLocaleString()} words</span>}
                      {result.fileSize && <span>{(result.fileSize / 1024 / 1024).toFixed(2)} MB</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio Player (for audiobooks) */}
              {mode === 'ebook-to-audio' && result.downloadUrl && (
                <div className="bg-muted rounded-xl p-4">
                  <audio
                    ref={audioRef}
                    src={result.downloadUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                  />
                  
                  {/* Controls */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)}
                      className="p-2 hover:bg-background rounded-lg transition-colors"
                    >
                      <SkipBack className="h-5 w-5" />
                    </button>
                    <button
                      onClick={togglePlayback}
                      className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                    >
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </button>
                    <button
                      onClick={() => audioRef.current && (audioRef.current.currentTime += 10)}
                      className="p-2 hover:bg-background rounded-lg transition-colors"
                    >
                      <SkipForward className="h-5 w-5" />
                    </button>
                    
                    {/* Progress */}
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                    
                    {/* Speed */}
                    <button
                      onClick={changeSpeed}
                      className="px-2 py-1 text-sm font-medium bg-background rounded-lg hover:bg-muted transition-colors"
                    >
                      {playbackSpeed}x
                    </button>
                    
                    {/* Volume */}
                    <button
                      onClick={toggleMute}
                      className="p-2 hover:bg-background rounded-lg transition-colors"
                    >
                      {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={result.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-5 w-5" />
                  Download
                </a>
                <button
                  onClick={() => result.downloadUrl && copyToClipboard(result.downloadUrl)}
                  className="flex items-center justify-center gap-2 px-6 py-3 border rounded-xl font-medium hover:bg-muted transition-colors"
                >
                  {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <a
                  href="/library"
                  className="flex items-center justify-center gap-2 px-6 py-3 border rounded-xl font-medium hover:bg-muted transition-colors"
                >
                  <Library className="h-5 w-5" />
                  Library
                </a>
              </div>

              {/* Create Another */}
              <button
                onClick={resetForm}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border rounded-xl font-medium hover:bg-muted transition-colors"
              >
                <Sparkles className="h-5 w-5" />
                Create Another
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">Conversion Failed</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
                  {!isAdmin && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Your credits have been automatically refunded.
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={resetForm}
                className="mt-4 w-full px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Powered by OpenAI TTS • Part of the{' '}
            <a href="https://craudiovizai.com" className="text-primary hover:underline">
              CR AudioViz AI
            </a>{' '}
            ecosystem
          </p>
        </div>
      </div>
    </main>
  )
}
