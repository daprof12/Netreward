-- Migration: Create Campaign with Escrow RPC (Complete Schema Fix)
-- Description: Adds missing escrow column and creates the campaign launch RPC.

-- 1. Fix the table schema (Add missing escrow column)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS escrow_nrt DECIMAL DEFAULT 0;

-- 2. Drop existing versions to avoid "not unique" error
DROP FUNCTION IF EXISTS public.create_campaign_with_escrow(UUID, TEXT, DECIMAL, DECIMAL, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.create_campaign_with_escrow(UUID, UUID, UUID, UUID, UUID, TEXT, DECIMAL, DECIMAL, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT, JSONB);

-- 3. Create the correct version
CREATE OR REPLACE FUNCTION public.create_campaign_with_escrow(
    p_creator_id UUID,
    p_sp_id UUID,
    p_isp_id UUID,
    p_service_id UUID,
    p_network_id UUID,
    p_title TEXT,
    p_reward_rate_per_gb DECIMAL,
    p_total_budget DECIMAL,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_is_recurring BOOLEAN,
    p_country TEXT,
    p_target_locations JSONB
) RETURNS JSONB AS $$
DECLARE
    v_campaign_id UUID;
    v_current_balance DECIMAL;
BEGIN
    -- 1. Lock the wallet row for update to prevent race conditions
    SELECT nrt_balance INTO v_current_balance 
    FROM public.wallets 
    WHERE user_id = p_creator_id 
    FOR UPDATE;

    -- 2. Check if user has enough balance
    IF v_current_balance IS NULL OR v_current_balance < p_total_budget THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Insufficient NRT balance. Required: ' || p_total_budget || ', Available: ' || COALESCE(v_current_balance, 0));
    END IF;

    -- 3. Create the campaign entry
    INSERT INTO public.campaigns (
        sp_id,
        isp_id,
        service_id,
        network_id,
        title,
        total_budget,
        escrow_nrt,
        reward_rate_per_gb,
        start_date,
        end_date,
        is_recurring,
        status,
        country,
        target_locations
    ) VALUES (
        p_sp_id,
        p_isp_id,
        p_service_id,
        p_network_id,
        p_title,
        p_total_budget,
        p_total_budget, -- Lock full budget in escrow
        p_reward_rate_per_gb,
        p_start_date,
        p_end_date,
        p_is_recurring,
        'active',
        p_country,
        p_target_locations
    ) RETURNING id INTO v_campaign_id;

    -- 4. Deduct NRT from user wallet
    UPDATE public.wallets 
    SET nrt_balance = nrt_balance - p_total_budget
    WHERE user_id = p_creator_id;

    -- 5. Log the transaction
    INSERT INTO public.transactions (
        user_id,
        amount,
        type,
        status,
        description,
        reference
    ) VALUES (
        p_creator_id,
        -p_total_budget,
        'escrow',
        'completed',
        'Budget Escrow for Campaign: ' || p_title,
        'CAMP-' || v_campaign_id
    );

    RETURN jsonb_build_object(
        'status', 'success', 
        'campaign_id', v_campaign_id,
        'message', 'Campaign launched successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant Permissions
GRANT EXECUTE ON FUNCTION public.create_campaign_with_escrow TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_campaign_with_escrow TO service_role;
