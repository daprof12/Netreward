-- Migration to add trigger for automatic public.user creation upon auth signup

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, role)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'display_name',
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'user'::user_role)
    );
    
    -- Also create an empty wallet for the user automatically
    INSERT INTO public.wallets (user_id)
    VALUES (new.id);

    -- Create role-specific profiles
    IF (new.raw_user_meta_data->>'role') = 'sp' THEN
        INSERT INTO public.sp_profiles (user_id, company_name)
        VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', 'New SP'));
    ELSIF (new.raw_user_meta_data->>'role') = 'isp' THEN
        INSERT INTO public.isp_profiles (user_id, isp_name)
        VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', 'New ISP'));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to fire after insert on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
