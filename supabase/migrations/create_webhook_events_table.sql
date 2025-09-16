-- Create webhook_events table to track Plaid webhooks
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_type TEXT NOT NULL,
  webhook_code TEXT NOT NULL,
  item_id TEXT,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_events_workspace_id ON public.webhook_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_item_id ON public.webhook_events(item_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at DESC);

-- Add connection_status column to institutions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'institutions'
    AND column_name = 'connection_status'
  ) THEN
    ALTER TABLE public.institutions
    ADD COLUMN connection_status TEXT DEFAULT 'connected';
  END IF;
END $$;

-- Add last_error column to institutions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'institutions'
    AND column_name = 'last_error'
  ) THEN
    ALTER TABLE public.institutions
    ADD COLUMN last_error JSONB;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for webhook_events
CREATE POLICY "Workspace members can view webhook events"
  ON public.webhook_events
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Service role can insert webhook events
CREATE POLICY "Service role can manage webhook events"
  ON public.webhook_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');