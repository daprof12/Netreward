-- Migration for Reward Collection and Tax Deduction
-- Created: 2026

-- 1. Add unclaimed_nrt to user_campaigns to track pending rewards
ALTER TABLE public.user_campaigns 
ADD COLUMN IF NOT EXISTS unclaimed_nrt NUMERIC(18, 9) DEFAULT 0.000000000;

-- 2. RPC function to claim all rewards with tax deduction
CREATE OR REPLACE FUNCTION public.claim_all_rewards(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_unclaimed NUMERIC(18,9);
    v_tax_rate NUMERIC(5,2);
    v_tax_label TEXT;
    v_country_code TEXT;
    v_tax_amount NUMERIC(18,9);
    v_net_amount NUMERIC(18,9);
    v_wallet_id UUID;
    v_transaction_id UUID;
    v_result JSONB;
BEGIN
    -- Get total unclaimed rewards
    SELECT COALESCE(SUM(unclaimed_nrt), 0)
    INTO v_total_unclaimed
    FROM public.user_campaigns
    WHERE user_id = p_user_id;

    IF v_total_unclaimed <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No rewards to claim');
    END IF;

    -- Get user country and tax rate
    SELECT country
    INTO v_country_code
    FROM public.users
    WHERE id = p_user_id;

    SELECT tax_percentage, tax_label
    INTO v_tax_rate, v_tax_label
    FROM public.country_tax_rates
    WHERE country_code = UPPER(v_country_code)
    AND is_active = true;

    -- Default to 0% if no rate found
    v_tax_rate := COALESCE(v_tax_rate, 0);
    v_tax_label := COALESCE(v_tax_label, 'Tax');

    -- Calculate tax
    v_tax_amount := (v_total_unclaimed * v_tax_rate) / 100;
    v_net_amount := v_total_unclaimed - v_tax_amount;

    -- Get wallet
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;

    -- Update wallet balance
    UPDATE public.wallets
    SET nrt_balance = nrt_balance + v_net_amount,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- Create transaction record
    INSERT INTO public.transactions (
        wallet_id,
        amount,
        tx_type,
        description
    ) VALUES (
        v_wallet_id,
        v_net_amount,
        'reward',
        format('Reward collection (Gross: %s, Tax: %s %s)', v_total_unclaimed, v_tax_amount, v_tax_label)
    ) RETURNING id INTO v_transaction_id;

    -- Record tax deduction
    INSERT INTO public.tax_deductions (
        user_id,
        transaction_id,
        gross_amount,
        tax_amount,
        net_amount,
        tax_rate_applied,
        country_code,
        tax_label
    ) VALUES (
        p_user_id,
        v_transaction_id,
        v_total_unclaimed,
        v_tax_amount,
        v_net_amount,
        v_tax_rate,
        v_country_code,
        v_tax_label
    );

    -- Reset unclaimed rewards in user_campaigns
    UPDATE public.user_campaigns
    SET unclaimed_nrt = 0
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'gross_amount', v_total_unclaimed,
        'tax_amount', v_tax_amount,
        'net_amount', v_net_amount,
        'tax_label', v_tax_label,
        'tax_rate', v_tax_rate
    );
END;
$$;
