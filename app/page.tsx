// app/page.tsx — Javari Books
// Complete AI-powered book discovery and reading tools — real API calls
// CR AudioViz AI, LLC · EIN 39-3646201 · May 2026
'use client'
import { useState } from 'react'
import { ACTIONS, FIELDS } from '@/lib/tool-data'


export default function BooksPage() {
  const [action, setAction] = useState(ACTIONS[0])
  const [values, setValues] = useState({})
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  function setV(id: string, val: string) { setValues(p => ({ ...p, [id]: val })) }

  async function generate() {
    setLoading(true); setError(''); setOutput('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.id, input: action.prompt(values) }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed')
      setOutput(data.result || '')
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong') }
    setLoading(false)
  }

  const fields = FIELDS[action.id] || []

  return (
    <div style={{ background: '#08060f', minHeight: '100vh', color: '#e2ddf0', fontFamily: 'Lora, Georgia, serif' }}>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(8,6,15,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(139,92,246,0.15)', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <a href="https://craudiovizai.com" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>📚</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#a78bfa', letterSpacing: '-0.02em' }}>Javari Books</span>
        </a>
        <a href="https://craudiovizai.com/auth/signup" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: 'white', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'system-ui' }}>Free Access →</a>
      </nav>
      <div style={{ height: 60 }} />

      <section style={{ textAlign: 'center', padding: '52px 24px 36px', maxWidth: 680, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 700, margin: '0 0 14px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Your AI <span style={{ color: '#a78bfa' }}>Literary Guide</span>
        </h1>
        <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.7, fontFamily: 'system-ui' }}>
          Book recommendations, summaries, author research, and reading plans.
          <strong style={{ color: '#a78bfa' }}> 50 free credits/month.</strong>
        </p>
      </section>

      <section style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ background: '#110e1e', border: '1px solid rgba(139,92,246,0.12)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
            {ACTIONS.map(a => (
              <button key={a.id} onClick={() => { setAction(a); setValues({}); setOutput('') }}
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: action.id === a.id ? 'rgba(139,92,246,0.1)' : 'transparent', borderLeft: action.id === a.id ? '3px solid #a78bfa' : '3px solid transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(139,92,246,0.06)', display: 'block' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: action.id === a.id ? '#c4b5fd' : '#9ca3af', fontFamily: 'system-ui' }}>{a.label}</div>
                <div style={{ fontSize: 11, color: '#374151', marginTop: 2, fontFamily: 'system-ui' }}>{a.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ background: '#110e1e', border: '1px solid rgba(139,92,246,0.12)', borderRadius: 14, padding: '18px' }}>
            {fields.map(f => (
              <div key={f.id} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 5, fontWeight: 500, fontFamily: 'system-ui' }}>{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea value={values[f.id] || ''} onChange={e => setV(f.id, e.target.value)} placeholder={f.placeholder} rows={3}
                    style={{ width: '100%', background: '#08060f', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, padding: '9px 13px', color: '#e2ddf0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'system-ui' }} />
                ) : (
                  <input value={values[f.id] || ''} onChange={e => setV(f.id, e.target.value)} placeholder={f.placeholder}
                    style={{ width: '100%', background: '#08060f', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, padding: '9px 13px', color: '#e2ddf0', fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'system-ui' }} />
                )}
              </div>
            ))}
            <button onClick={generate} disabled={loading}
              style={{ width: '100%', background: loading ? '#1a1428' : 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: loading ? '#374151' : 'white', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8, fontFamily: 'system-ui' }}>
              {loading ? '📖 Researching...' : `Generate ${action.label}`}
            </button>
            {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10, fontFamily: 'system-ui' }}>⚠ {error}</p>}
          </div>
        </div>
        <div style={{ background: '#110e1e', border: '1px solid rgba(139,92,246,0.12)', borderRadius: 14, overflow: 'hidden', position: 'sticky', top: 80 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'system-ui' }}>Results</span>
            {output && <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: copied ? '#a78bfa' : '#6b7280', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>{copied ? '✓ Copied' : 'Copy'}</button>}
          </div>
          {output ? (
            <textarea value={output} readOnly style={{ width: '100%', background: 'transparent', border: 'none', padding: '20px', color: '#e2ddf0', fontSize: 14, lineHeight: 1.8, resize: 'vertical', minHeight: 440, boxSizing: 'border-box', outline: 'none' }} />
          ) : (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>{loading ? '⏳' : '📚'}</div>
              <p style={{ color: '#1c1830', fontSize: 13, lineHeight: 1.7, fontFamily: 'system-ui' }}>{loading ? 'Consulting the literary AI...' : 'Choose a tool and fill in the
details to get started.'}</p>
            </div>
          )}
        </div>
      </section>
      <footer style={{ background: '#060410', borderTop: '1px solid rgba(139,92,246,0.07)', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#110e1e', fontSize: 12, margin: 0, fontFamily: 'system-ui' }}>© 2026 CR AudioViz AI, LLC — EIN: 39-3646201 · Fort Myers, Florida · Your Story. Our Design.</p>
      </footer>
    </div>
  )
}
