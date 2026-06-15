-- Migration: Add RLS Delete Policy for user_campaigns
-- Description: Allows authenticated users to leave/unjoin campaigns by deleting their own enrollment rows.

CREATE POLICY "Users can delete own enrollments"
ON public.user_campaigns FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
