'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Headphones, FileAudio, Zap, CreditCard, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    credits: 1000,
    booksGenerated: 0,
    audiobooksCreated: 0,
    transcriptions: 0
  })

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Manage your books and credits</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={<CreditCard className="h-6 w-6" />}
            label="Credits Available"
            value={stats.credits.toLocaleString()}
            color="text-primary"
          />
          <StatCard
            icon={<BookOpen className="h-6 w-6" />}
            label="eBooks Generated"
            value={stats.booksGenerated.toString()}
            color="text-blue-500"
          />
          <StatCard
            icon={<Headphones className="h-6 w-6" />}
            label="Audiobooks Created"
            value={stats.audiobooksCreated.toString()}
            color="text-purple-500"
          />
          <StatCard
            icon={<FileAudio className="h-6 w-6" />}
            label="Transcriptions"
            value={stats.transcriptions.toString()}
            color="text-orange-500"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <ActionCard
              href="/create"
              icon={<BookOpen className="h-8 w-8" />}
              title="Create eBook"
              description="Generate a new eBook with AI"
              credits="50 credits"
            />
            <ActionCard
              href="/convert?mode=ebook-to-audio"
              icon={<Headphones className="h-8 w-8" />}
              title="eBook to Audiobook"
              description="Convert text to professional audio"
              credits="100 credits"
            />
            <ActionCard
              href="/convert?mode=audio-to-ebook"
              icon={<FileAudio className="h-8 w-8" />}
              title="Audio to eBook"
              description="Transcribe audio to formatted text"
              credits="75 credits"
            />
          </div>
        </div>

        {/* Credit Costs */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Credit Pricing</h2>
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-6 py-4">Action</th>
                  <th className="text-right px-6 py-4">Credits</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-6 py-4">Generate Single eBook</td>
                  <td className="text-right px-6 py-4 font-mono">50</td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">Bulk Generate (per book)</td>
                  <td className="text-right px-6 py-4 font-mono">40</td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">eBook to Audiobook</td>
                  <td className="text-right px-6 py-4 font-mono">100</td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">Audio to eBook Transcription</td>
                  <td className="text-right px-6 py-4 font-mono">75</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription Plans */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Subscription Plans</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border rounded-xl p-6">
              <h3 className="text-xl font-bold mb-2">Creator Annual</h3>
              <div className="text-3xl font-bold text-primary mb-4">$199<span className="text-lg text-muted-foreground">/year</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Full Library Access (300+ books)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  1,000 Credits/month
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Audiobook Streaming
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  50% Off Conversions
                </li>
              </ul>
              <button className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">
                Subscribe
              </button>
            </div>
            <div className="bg-card border-2 border-primary rounded-xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                BEST VALUE
              </div>
              <h3 className="text-xl font-bold mb-2">Pro Annual</h3>
              <div className="text-3xl font-bold text-primary mb-4">$499<span className="text-lg text-muted-foreground">/year</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Everything in Creator
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  5,000 Credits/month
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Source Files Access
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Commercial License
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  API Access
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  White-Label Rights
                </li>
              </ul>
              <button className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-card border rounded-xl p-6">
      <div className={`${color} mb-3`}>{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function ActionCard({ href, icon, title, description, credits }: { href: string; icon: React.ReactNode; title: string; description: string; credits: string }) {
  return (
    <Link href={href} className="block">
      <div className="bg-card border rounded-xl p-6 hover:shadow-lg hover:border-primary/50 transition-all">
        <div className="text-primary mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">{credits}</span>
      </div>
    </Link>
  )
}
