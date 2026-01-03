'use client'

import { useState, useRef, useEffect } from 'react'
import { Headphones, FileAudio, Loader2, Download, Upload, CheckCircle, AlertCircle, LogIn, Coins, Library, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { CentralAuth, CentralCredits, CentralAnalytics, CentralActivity, CREDIT_COSTS, type User } from '@/lib/central-services'

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

export default function ConvertPage() {
  const [mode, setMode] = useState<Mode>('ebook-to-audio')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [creditBalance, setCreditBalance] = useState<number>(0)
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

  // Check if user is admin (free access)
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email)

  // Check auth and credits on mount
  useEffect(() => {
    checkAuth()
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

  const handleLogin = () => {
    window.location.href = CentralAuth.getLoginUrl()
  }

  const handleEbookToAudio = async () => {
    if (!user) {
      toast.error('Please log in to convert')
      handleLogin()
      return
    }

    if (!text) {
      toast.error('Please enter text to convert')
      return
    }

    const creditCost = isAdmin ? 0 : CREDIT_COSTS.EBOOK_TO_AUDIO

    // Check credits (skip for admins)
    if (!isAdmin) {
      const creditCheck = await CentralCredits.hasEnough(creditCost)
      if (!creditCheck.hasEnough) {
        toast.error(`Insufficient credits. Need ${creditCost}, have ${creditCheck.balance}`)
        return
      }
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
      // Deduct credits (skip for admins)
      if (!isAdmin) {
        const deductResult = await CentralCredits.deduct(
          creditCost,
          `eBook to Audiobook: ${title || 'Untitled'}`
        )
        if (!deductResult.success) {
          toast.error('Failed to deduct credits')
          setLoading(false)
          return
        }
        if (deductResult.data) {
          setCreditBalance(deductResult.data.balance)
        }
      }

      CentralActivity.log('ebook_to_audio_started', { title, wordCount, voice, isAdmin })

      const response = await fetch('/api/ebook-to-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          title: title || 'Untitled', 
          voice,
          userId: user.id,
          userEmail: user.email,
          saveToLibrary: true
        })
      })

      const data = await response.json()

      if (data.success && data.audiobook) {
        setResult(data.audiobook)
        toast.success('Audiobook created and saved to your library!')
        CentralActivity.log('ebook_to_audio_completed', { 
          title: data.audiobook.title,
          duration: data.audiobook.duration,
          assetId: data.audiobook.assetId
        })
        CentralAnalytics.track('conversion_completed', { type: 'ebook_to_audio', isAdmin })
      } else {
        // Refund credits on failure (skip for admins)
        if (!isAdmin) {
          await CentralCredits.refund(creditCost, 'Conversion failed')
          await checkAuth()
        }
        setError(data.error || 'Conversion failed')
        toast.error(data.error || 'Conversion failed - credits refunded')
      }
    } catch (err: any) {
      if (!isAdmin) {
        await CentralCredits.refund(CREDIT_COSTS.EBOOK_TO_AUDIO, `Error: ${err.message}`)
        await checkAuth()
      }
      setError(err.message || 'Failed to convert')
      toast.error('Failed to convert' + (isAdmin ? '' : ' - credits refunded'))
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const handleAudioToEbook = async () => {
    if (!user) {
      toast.error('Please log in to convert')
      handleLogin()
      return
    }

    if (!audioFile) {
      toast.error('Please select an audio file')
      return
    }

    const creditCost = isAdmin ? 0 : CREDIT_COSTS.AUDIO_TO_EBOOK

    if (!isAdmin) {
      const creditCheck = await CentralCredits.hasEnough(creditCost)
      if (!creditCheck.hasEnough) {
        toast.error(`Insufficient credits. Need ${creditCost}, have ${creditCheck.balance}`)
        return
      }
    }

    setLoading(true)
    setResult(null)
    setError(null)
    setProgress('Uploading and transcribing audio...')

    try {
      if (!isAdmin) {
        const deductResult = await CentralCredits.deduct(
          creditCost,
          `Audio to eBook: ${title || audioFile.name}`
        )
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
        toast.success('eBook created and saved to your library!')
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
  const currentCost = mode === 'ebook-to-audio' ? CREDIT_COSTS.EBOOK_TO_AUDIO : CREDIT_COSTS.AUDIO_TO_EBOOK

  // Loading auth state
  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <main className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="bg-card border rounded-xl p-8 text-center">
            <LogIn className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              Please sign in to your CR AudioViz AI account to use Javari Books.
            </p>
            <button
              onClick={handleLogin}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90"
            >
              <LogIn className="h-5 w-5" />
              Sign In to Continue
            </button>
            <p className="text-sm text-muted-foreground mt-4">
              Don't have an account?{' '}
              <a href="https://craudiovizai.com/signup" className="text-primary hover:underline">
                Sign up free
              </a>
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header with Credit Balance */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Javari Books</h1>
            <p className="text-muted-foreground">
              Convert eBooks to audiobooks or transcribe audio to text
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full text-sm">
                <Crown className="h-4 w-4" />
                Admin
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
              <Coins className="h-5 w-5 text-primary" />
              <span className="font-semibold">{isAdmin ? '∞' : creditBalance.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">credits</span>
            </div>
            <a 
              href="/library" 
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted"
            >
              <Library className="h-5 w-5" />
              My Library
            </a>
          </div>
        </div>

        {/* Insufficient Credits Warning (not for admins) */}
        {!isAdmin && creditBalance < currentCost && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Insufficient Credits</p>
                <p className="text-sm text-muted-foreground">
                  This conversion requires {currentCost} credits. You have {creditBalance}.{' '}
                  <a href="/credits" className="text-primary hover:underline">Buy more credits</a>
                </p>
              </div>
            </div>
          </div>
        )}

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
            {!isAdmin && <span className="text-xs opacity-75">({CREDIT_COSTS.EBOOK_TO_AUDIO} cr)</span>}
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
            {!isAdmin && <span className="text-xs opacity-75">({CREDIT_COSTS.AUDIO_TO_EBOOK} cr)</span>}
          </button>
        </div>

        {/* SUCCESS RESULT */}
        {result && result.downloadUrl && (
          <div className="mb-8 bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <h3 className="text-xl font-bold text-green-700 dark:text-green-300">
                🎉 Conversion Complete!
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-white dark:bg-gray-900 rounded-lg p-4">
                {result.title && (
                  <div><span className="text-muted-foreground">Title:</span> <span className="font-medium ml-2">{result.title}</span></div>
                )}
                {result.voice && (
                  <div><span className="text-muted-foreground">Voice:</span> <span className="font-medium ml-2">{result.voice}</span></div>
                )}
                {result.duration && (
                  <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium ml-2">{result.duration}</span></div>
                )}
                {result.fileSize && (
                  <div><span className="text-muted-foreground">Size:</span> <span className="font-medium ml-2">{(result.fileSize / 1024 / 1024).toFixed(2)} MB</span></div>
                )}
              </div>
              
              <div className="bg-green-100 dark:bg-green-900 rounded-lg p-4">
                <p className="text-sm font-medium mb-3 text-green-800 dark:text-green-200">
                  ✅ Saved to your library! Download below:
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
                    DOWNLOAD
                  </a>
                  <a
                    href="/library"
                    className="inline-flex items-center gap-2 px-6 py-4 border-2 border-green-600 text-green-600 rounded-lg font-medium hover:bg-green-50"
                  >
                    <Library className="h-5 w-5" />
                    View in Library
                  </a>
                </div>
                
                {mode === 'ebook-to-audio' && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Or listen here:</p>
                    <audio controls src={result.downloadUrl} className="w-full" preload="metadata" />
                  </div>
                )}
              </div>
              
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
                  This may take several minutes. Your file will be saved to your library when complete.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Forms - Only show when no result */}
        {!result && (
          <>
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
                    disabled={loading || !text || (!isAdmin && creditBalance < CREDIT_COSTS.EBOOK_TO_AUDIO)}
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
                        Convert to Audiobook {isAdmin ? '(Admin - Free)' : `(${CREDIT_COSTS.EBOOK_TO_AUDIO} credits)`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

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
                    disabled={loading || !audioFile || (!isAdmin && creditBalance < CREDIT_COSTS.AUDIO_TO_EBOOK)}
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
                        Transcribe to eBook {isAdmin ? '(Admin - Free)' : `(${CREDIT_COSTS.AUDIO_TO_EBOOK} credits)`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Logged in as {user.email}
          {isAdmin && ' (Platform Admin)'} •{' '}
          <button onClick={() => CentralAuth.signOut().then(() => window.location.reload())} className="text-primary hover:underline">
            Sign Out
          </button>
        </div>
      </div>
    </main>
  )
}
