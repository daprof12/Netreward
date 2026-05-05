-- 1. Resolve duplicates by appending the first 4 chars of user ID to duplicates
UPDATE public.users 
SET display_name = display_name || '_' || substr(id::text, 1, 4)
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY LOWER(display_name) ORDER BY created_at ASC) as rn
    FROM public.users
    WHERE display_name IS NOT NULL
  ) t WHERE rn > 1
);

-- 2. Add UNIQUE constraint
-- First drop if exists just in case
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_display_name_key;
ALTER TABLE public.users ADD CONSTRAINT users_display_name_key UNIQUE (display_name);

-- 3. Create check function to bypass RLS and return availability + suggestion
CREATE OR REPLACE FUNCTION check_display_name_availability(p_display_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_available boolean;
    suggestion text;
    counter integer := 1;
BEGIN
    -- If empty, return unavailable with no suggestion
    IF p_display_name IS NULL OR TRIM(p_display_name) = '' THEN
        RETURN json_build_object('available', false, 'suggestion', null);
    END IF;

    -- Check if name exists (case-insensitive)
    SELECT NOT EXISTS (
        SELECT 1 FROM public.users WHERE display_name ILIKE p_display_name
    ) INTO is_available;

    IF is_available THEN
        RETURN json_build_object('available', true);
    END IF;

    -- Generate suggestion by appending numbers
    suggestion := p_display_name || floor(random() * 1000)::text;
    LOOP
        SELECT NOT EXISTS (
            SELECT 1 FROM public.users WHERE display_name ILIKE suggestion
        ) INTO is_available;
        
        EXIT WHEN is_available;
        counter := counter + 1;
        suggestion := p_display_name || floor(random() * 10000)::text;
        
        -- Prevent infinite loop in worst case
        IF counter > 10 THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN json_build_object('available', false, 'suggestion', suggestion);
END;
$$;
