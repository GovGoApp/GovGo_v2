CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_report_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_thread_id text,
  title text NOT NULL DEFAULT 'Novo chat',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES public.user_report_chats(id),
  message_id uuid,
  question text,
  sql text NOT NULL,
  executed_sql text,
  title text NOT NULL DEFAULT 'Relatorio',
  subtitle text,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  elapsed_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  error text,
  is_favorite boolean NOT NULL DEFAULT false,
  favorited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_opened_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.user_report_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.user_report_chats(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  sql text,
  report_id uuid REFERENCES public.user_reports(id),
  report_title text,
  report_subtitle text,
  row_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  error text,
  message_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'user_reports_message_id_fkey'
       AND conrelid = 'public.user_reports'::regclass
  ) THEN
    ALTER TABLE public.user_reports
      ADD CONSTRAINT user_reports_message_id_fkey
      FOREIGN KEY (message_id) REFERENCES public.user_report_messages(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_report_workspace (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_chat_id uuid REFERENCES public.user_report_chats(id),
  active_report_id uuid REFERENCES public.user_reports(id),
  history_mode text NOT NULL DEFAULT 'chats',
  chat_open boolean NOT NULL DEFAULT true,
  tabs jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_report_messages
  ADD COLUMN IF NOT EXISTS message_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_report_chats_user_updated
  ON public.user_report_chats (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_report_messages_chat_created
  ON public.user_report_messages (chat_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_user_report_messages_chat_order
  ON public.user_report_messages (chat_id, message_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_user_reports_user_created
  ON public.user_reports (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_reports_user_favorite
  ON public.user_reports (user_id, is_favorite, favorited_at DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_reports_chat_created
  ON public.user_reports (chat_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.user_report_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_report_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_report_workspace ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'user_report_chats'
       AND policyname = 'user_report_chats_owner'
  ) THEN
    CREATE POLICY user_report_chats_owner
      ON public.user_report_chats
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'user_report_messages'
       AND policyname = 'user_report_messages_owner'
  ) THEN
    CREATE POLICY user_report_messages_owner
      ON public.user_report_messages
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'user_reports'
       AND policyname = 'user_reports_owner'
  ) THEN
    CREATE POLICY user_reports_owner
      ON public.user_reports
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'user_report_workspace'
       AND policyname = 'user_report_workspace_owner'
  ) THEN
    CREATE POLICY user_report_workspace_owner
      ON public.user_report_workspace
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
