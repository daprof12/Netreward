-- Migration: Final Campaign Launch Fix
-- Description: Adds 'escrow' to transaction types and fixes the Launch RPC schema.

-- 1. Update the Enum to allow 'escrow' transactions
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'escrow';

-- 2. Fix the table schema (Ensure missing columns exist)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS escrow_nrt DECIMAL DEFAULT 0;

-- 3. Drop existing versions to avoid "not unique" error
DROP FUNCTION IF EXISTS public.create_campaign_with_escrow(UUID, TEXT, DECIMAL, DECIMAL, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.create_campaign_with_escrow(UUID, UUID, UUID, UUID, UUID, TEXT, DECIMAL, DECIMAL, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT, JSONB);

-- 4. Create the corrected version
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
    v_wallet_id UUID;
    v_current_balance DECIMAL;
BEGIN
    -- 1. Get the wallet ID and lock the row
    SELECT id, nrt_balance INTO v_wallet_id, v_current_balance 
    FROM public.wallets 
    WHERE user_id = p_creator_id 
    FOR UPDATE;

    -- 2. Safety checks
    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'User wallet not found');
    END IF;

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
        p_total_budget,
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
    WHERE id = v_wallet_id;

    -- 5. Log the transaction
    INSERT INTO public.transactions (
        wallet_id,
        amount,
        tx_type,
        description,
        blockchain_signature
    ) VALUES (
        v_wallet_id,
        -p_total_budget,
        'escrow'::transaction_type,
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

-- 5. Grant Permissions
GRANT EXECUTE ON FUNCTION public.create_campaign_with_escrow TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_campaign_with_escrow TO service_role;
