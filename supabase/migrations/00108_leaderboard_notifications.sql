-- Migration: Leaderboard Notifications
-- Adds a trigger to automatically send notifications to users when a new leaderboard event is created.

CREATE OR REPLACE FUNCTION public.notify_leaderboard_event_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when a new event is created
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        SELECT 
            u.id, 
            'New Leaderboard Challenge: ' || NEW.title,
            'A new leaderboard event has been created! Join the competition and climb the ranks to win NRT prizes.',
            'campaign',
            '/leaderboard'
        FROM public.users u
        WHERE u.role = 'user'
        -- Respect user notification preferences (default to true if not set)
        AND (
            COALESCE(u.notification_preferences->'types'->>'campaign', 'true')::BOOLEAN = true
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_leaderboard_event_created ON public.leaderboard_events;
CREATE TRIGGER on_leaderboard_event_created
    AFTER INSERT ON public.leaderboard_events
    FOR EACH ROW
    EXECUTE PROCEDURE public.notify_leaderboard_event_created();
