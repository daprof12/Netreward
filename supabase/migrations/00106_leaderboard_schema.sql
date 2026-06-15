-- Leaderboard Schema
CREATE TYPE leaderboard_event_type AS ENUM ('campaign_earned', 'referrals', 'nrt_spent');

CREATE TABLE leaderboard_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type leaderboard_event_type NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'upcoming', -- upcoming, active, ended
    prizes JSONB DEFAULT '[]'::jsonb, -- e.g., [{"rank": 1, "reward": 50000}, ...]
    conditions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note: We might compute entries dynamically from other tables in queries
-- but storing a cache or final result is good.
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES leaderboard_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score NUMERIC DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE leaderboard_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Policies for leaderboard_events
CREATE POLICY "Public can view active and ended leaderboard events" 
    ON leaderboard_events FOR SELECT 
    USING (status IN ('active', 'ended'));

CREATE POLICY "Admins can manage leaderboard events" 
    ON leaderboard_events FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Policies for leaderboard_entries
CREATE POLICY "Public can view leaderboard entries" 
    ON leaderboard_entries FOR SELECT 
    USING (true);

CREATE POLICY "Admins can manage leaderboard entries" 
    ON leaderboard_entries FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
