-- Migration: Leaderboard Reward Distribution & Admin Treasury
-- Adds functionality to automatically distribute NRT to leaderboard winners

-- 1. Add distribution tracking columns
ALTER TABLE public.leaderboard_events
ADD COLUMN IF NOT EXISTS is_distributed BOOLEAN DEFAULT false;

ALTER TABLE public.leaderboard_entries
ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(18, 6) DEFAULT 0.000000;

-- 2. Add new transaction type
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'leaderboard_reward';

-- 3. Create the RPC function to distribute rewards
CREATE OR REPLACE FUNCTION distribute_leaderboard_rewards(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event RECORD;
    v_treasury_id UUID;
    v_treasury_balance NUMERIC(18,6);
    v_total_payout NUMERIC(18,6) := 0;
    v_entry RECORD;
    v_prize JSONB;
    v_reward NUMERIC(18,6);
    v_user_wallet_id UUID;
BEGIN
    -- 1. Get Event and lock it
    SELECT * INTO v_event FROM public.leaderboard_events WHERE id = p_event_id FOR UPDATE;

    IF v_event IS NULL THEN
        RAISE EXCEPTION 'Leaderboard event not found';
    END IF;

    IF v_event.status != 'ended' THEN
        RAISE EXCEPTION 'Event has not ended yet';
    END IF;

    IF v_event.is_distributed THEN
        RAISE EXCEPTION 'Rewards for this event have already been distributed';
    END IF;

    -- 2. Get Admin Treasury and lock it
    SELECT id, nrt_balance INTO v_treasury_id, v_treasury_balance
    FROM public.admin_treasury
    LIMIT 1 FOR UPDATE;

    IF v_treasury_id IS NULL THEN
        RAISE EXCEPTION 'Admin treasury not initialized';
    END IF;

    -- 3. Iterate through entries and distribute
    FOR v_entry IN 
        SELECT * FROM public.leaderboard_entries 
        WHERE event_id = p_event_id 
        ORDER BY rank ASC 
    LOOP
        v_reward := 0;

        -- Find matching prize tier
        FOR v_prize IN SELECT * FROM jsonb_array_elements(v_event.prizes)
        LOOP
            IF v_entry.rank >= (v_prize->>'startRank')::INTEGER AND v_entry.rank <= (v_prize->>'endRank')::INTEGER THEN
                v_reward := (v_prize->>'reward')::NUMERIC;
                EXIT;
            END IF;
        END LOOP;

        IF v_reward > 0 THEN
            -- Check Treasury liquidity
            IF v_treasury_balance < v_reward THEN
                RAISE EXCEPTION 'Insufficient liquidity in Admin Treasury to payout rewards';
            END IF;

            -- Get User Wallet
            SELECT id INTO v_user_wallet_id FROM public.wallets WHERE user_id = v_entry.user_id;

            IF v_user_wallet_id IS NOT NULL THEN
                -- Deduct from Treasury
                v_treasury_balance := v_treasury_balance - v_reward;
                UPDATE public.admin_treasury SET nrt_balance = v_treasury_balance, updated_at = now() WHERE id = v_treasury_id;

                -- Add to User Wallet
                UPDATE public.wallets SET nrt_balance = nrt_balance + v_reward, updated_at = now() WHERE id = v_user_wallet_id;

                -- Record Transaction
                INSERT INTO public.transactions (wallet_id, amount, tx_type, description, status)
                VALUES (v_user_wallet_id, v_reward, 'leaderboard_reward', 'Reward for leaderboard: ' || v_event.title, 'completed');

                -- Update Entry
                UPDATE public.leaderboard_entries SET reward_amount = v_reward WHERE id = v_entry.id;

                v_total_payout := v_total_payout + v_reward;
            END IF;
        END IF;
    END LOOP;

    -- 4. Mark Event as distributed
    UPDATE public.leaderboard_events SET is_distributed = true WHERE id = p_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Distributed successfully',
        'total_payout', v_total_payout
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
