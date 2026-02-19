-- Allow deleting own draft broadcast notifications
-- Fixes RLS blocking draft deletes from admin UI

DROP POLICY IF EXISTS "admins_can_delete_own_draft_broadcast_notifications" ON public.broadcast_notifications;

CREATE POLICY "admins_can_delete_own_draft_broadcast_notifications"
ON public.broadcast_notifications
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND status = 'draft'
);
