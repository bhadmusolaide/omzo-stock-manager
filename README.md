# Omzo Farmz Stock Manager

A full-stack poultry farm management platform built with [Next.js](https://nextjs.org) and [Supabase](https://supabase.com). Manage batches, track feed usage, process orders, and gain AI-powered insights for optimal farm operations.

## Features

- **Batch Management** - Track poultry batches from DOC (day-old chicks) through brooding, growing, processing, and closure
- **Feed Management** - Record feed purchases, usage, and borrowing across batches with consumption projections
- **Order Processing** - Handle dressed and live bird orders with payment tracking (pending, partial, paid, complimentary)
- **Inventory Management** - Track dressed inventory with real-time stock levels and adjustments
- **Mortality Tracking** - Record and monitor mortality rates with automatic calculations
- **Processing Events** - Log processing events with weight tracking and dressed inventory backfill
- **Financial Reports** - Revenue reports, expense tracking, batch profitability analysis
- **AI-Powered Insights** - Feed consumption predictions, growth projections, and pricing suggestions
- **Dashboard** - Real-time overview with key performance indicators

## Tech Stack

- **Frontend**: Next.js (React), TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Layer**: Custom AI insights engine for predictions and analytics
- **Database**: PostgreSQL via Supabase

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account (free tier works)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/bhadmusolaide/omzo-stock-manager.git
cd omzo-stock-manager
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. Run database migrations (see `supabase/migrations/` directory)

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
├── components/       # Shared UI components
├── features/         # Feature-specific components and hooks
├── hooks/            # Data access hooks (Supabase queries)
└── lib/              # Utility functions, services, and AI engine
supabase/
├── config.toml       # Supabase CLI configuration
└── migrations/       # Database migrations
public/               # Static assets (images, icons)
```