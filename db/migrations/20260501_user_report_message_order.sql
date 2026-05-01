ALTER TABLE public.user_report_messages
  ADD COLUMN IF NOT EXISTS message_order integer;

WITH ordered_messages AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY chat_id
      ORDER BY created_at ASC, CASE role WHEN 'user' THEN 0 ELSE 1 END ASC, id ASC
    ) - 1 AS next_order
  FROM public.user_report_messages
  WHERE message_order IS NULL
)
UPDATE public.user_report_messages AS message
   SET message_order = ordered_messages.next_order
  FROM ordered_messages
 WHERE message.id = ordered_messages.id;

ALTER TABLE public.user_report_messages
  ALTER COLUMN message_order SET DEFAULT 0;

ALTER TABLE public.user_report_messages
  ALTER COLUMN message_order SET NOT NULL;

WITH duplicate_chats AS (
  SELECT DISTINCT chat_id
  FROM (
    SELECT chat_id, message_order, COUNT(*) AS duplicate_count
      FROM public.user_report_messages
     GROUP BY chat_id, message_order
    HAVING COUNT(*) > 1
  ) duplicated_orders
),
renumbered AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY chat_id
      ORDER BY created_at ASC, CASE role WHEN 'user' THEN 0 ELSE 1 END ASC, id ASC
    ) - 1 AS next_order
  FROM public.user_report_messages
  WHERE chat_id IN (SELECT chat_id FROM duplicate_chats)
)
UPDATE public.user_report_messages AS message
   SET message_order = renumbered.next_order
  FROM renumbered
 WHERE message.id = renumbered.id;

CREATE INDEX IF NOT EXISTS idx_user_report_messages_chat_order
  ON public.user_report_messages (chat_id, message_order ASC, created_at ASC);
