-- Migration: Grant privileges for user_subscriptions table

GRANT ALL ON TABLE public.user_subscriptions TO authenticated;
GRANT ALL ON TABLE public.user_subscriptions TO service_role;
