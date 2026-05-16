-- Kaamlink AI Service Orchestrator — Supabase Schema
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kawqktwowimbgonldaeu/sql/new

-- ── providers table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.providers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    services          TEXT[] NOT NULL DEFAULT '{}',
    rating            NUMERIC(3,1) NOT NULL DEFAULT 4.0,
    cancellation_rate NUMERIC(4,2) NOT NULL DEFAULT 0.05,
    base_price        INTEGER NOT NULL DEFAULT 1500,
    location          TEXT NOT NULL DEFAULT 'Unknown',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── agent_logs table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name  TEXT NOT NULL,
    decision    TEXT NOT NULL,
    reasoning   TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── bookings table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.providers(id),
    service     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'confirmed',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Enable Row Level Security (open read for hackathon demo) ─────────────────
ALTER TABLE public.providers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON public.providers   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.agent_logs  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.bookings    FOR ALL TO anon USING (true) WITH CHECK (true);
