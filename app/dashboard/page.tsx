'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Headphones, FileAudio, CreditCard, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalBooks: 301,
    totalAudiobooks: 0,
    credits: 1000,
    conversions: 0
  })

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Manage your books and conversions</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={<BookOpen className="h-6 w-6" />}
            label="eBooks in Library"
            value={stats.totalBooks.toLocaleString()}
            color="text-blue-500"
          />
          <StatCard
            icon={<Headphones className="h-6 w-6" />}
            label="Audiobooks Created"
            value={stats.totalAudiobooks.toString()}
            color="text-purple-500"
          />
          <StatCard
            icon={<CreditCard className="h-6 w-6" />}
            label="Available Credits"
            value={stats.credits.toLocaleString()}
            color="text-green-500"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6" />}
            label="Total Conversions"
            value={stats.conversions.toString()}
            color="text-orange-500"
          />
        </div>

        {/* Quick Actions */}
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <QuickActionCard
            icon={<BookOpen className="h-8 w-8" />}
            title="Create eBook"
            description="Generate a new professional eBook with AI"
            href="/create"
            credits={50}
          />
          <QuickActionCard
            icon={<Zap className="h-8 w-8" />}
            title="Bulk Generate"
            description="Create multiple eBooks at once"
            href="/create?mode=bulk"
            credits={40}
            suffix="/book"
          />
          <QuickActionCard
            icon={<Headphones className="h-8 w-8" />}
            title="eBook → Audiobook"
            description="Convert text to professional audio"
            href="/convert?mode=ebook-to-audio"
            credits={100}
          />
          <QuickActionCard
            icon={<FileAudio className="h-8 w-8" />}
            title="Audiobook → eBook"
            description="Transcribe audio to formatted text"
            href="/convert?mode=audio-to-ebook"
            credits={75}
          />
        </div>

        {/* Credit Costs */}
        <h2 className="text-2xl font-bold mb-6">Credit Costs</h2>
        <div className="bg-card border rounded-xl p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CreditCostItem action="Generate eBook" cost={50} />
            <CreditCostItem action="Bulk Generate" cost={40} suffix="/book" />
            <CreditCostItem action="eBook → Audiobook" cost={100} />
            <CreditCostItem action="Audiobook → eBook" cost={75} />
          </div>
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Credits never expire on paid plans. Automatic refunds on errors.
              <br />
              Need more credits? <Link href="/pricing" className="text-primary hover:underline">Upgrade your plan</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-card border rounded-xl p-6">
      <div className={`${color} mb-3`}>{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function QuickActionCard({
  icon,
  title,
  description,
  href,
  credits,
  suffix = ''
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  credits: number
  suffix?: string
}) {
  return (
    <Link href={href}>
      <div className="bg-card border rounded-xl p-6 hover:border-primary hover:shadow-md transition-all h-full">
        <div className="text-primary mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="text-sm font-medium text-primary">
          {credits} credits{suffix}
        </div>
      </div>
    </Link>
  )
}

function CreditCostItem({ 
  action, 
  cost, 
  suffix = '' 
}: { 
  action: string
  cost: number
  suffix?: string
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{action}</span>
      <span className="font-semibold">{cost} credits{suffix}</span>
    </div>
  )
}
