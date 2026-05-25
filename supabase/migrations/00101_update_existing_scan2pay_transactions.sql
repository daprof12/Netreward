-- Update any existing scan2pay transactions that were left in 'pending' state
UPDATE public.transactions
SET status = 'completed'
WHERE tx_type = 'scan2pay' AND status = 'pending';
