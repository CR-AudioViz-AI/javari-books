# Javari Books

Unified AI-powered eBook and Audiobook platform by CR AudioViz AI, LLC.

## Features

- **eBook Generator** - Create full-length professional eBooks with AI
- **eBook to Audiobook** - Convert text to professional audio with OpenAI TTS
- **Audiobook to eBook** - Transcribe audio to formatted text with Whisper
- **Library** - Browse 300+ professional eBooks
- **Bulk Generation** - Generate multiple books autonomously
- **Credit System** - Pay-per-use with subscription options

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Database + Storage)
- OpenAI (GPT-4, TTS, Whisper)
- Stripe (Payments)

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
EBOOKS_CATEGORY_ID=
RESEND_API_KEY=
```

## Credit Costs

| Action | Credits |
|--------|---------|
| Generate Single eBook | 50 |
| Bulk Generate (per book) | 40 |
| eBook to Audiobook | 100 |
| Audio to eBook | 75 |

## API Endpoints

- `POST /api/generate-ebook` - Generate a single eBook
- `POST /api/bulk-generate` - Bulk generate multiple eBooks
- `POST /api/ebook-to-audio` - Convert eBook to audiobook
- `POST /api/audio-to-ebook` - Transcribe audio to eBook
- `GET /api/library` - Browse eBook library

---

"Your Story. Our Design." - CR AudioViz AI, LLC
