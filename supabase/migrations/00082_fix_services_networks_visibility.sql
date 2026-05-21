-- Migration: Fix Services and Networks Visibility for Participants
-- Description: Adds RLS policies to allow anyone to select/view services or networks that are linked to active campaigns, preventing blank app logos and incorrect categories in the participant view.

-- 1. Services Visibility Policy
CREATE POLICY "Anyone can view services linked to active campaigns" 
ON public.services FOR SELECT 
USING (id IN (SELECT service_id FROM public.campaigns WHERE status = 'active'));

-- 2. Networks Visibility Policy
CREATE POLICY "Anyone can view networks linked to active campaigns" 
ON public.networks FOR SELECT 
USING (id IN (SELECT network_id FROM public.campaigns WHERE status = 'active'));
