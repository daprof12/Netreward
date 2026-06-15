# NetReward Disaster Recovery Runbook

This document outlines the standard operating procedures (SOPs) for responding to critical system failures, data loss, and security breaches within the NetReward infrastructure.

---

## 1. Database Corruption or Accidental Data Deletion

**Severity**: Critical
**Symptoms**: Application throwing `500` errors related to missing tables, users complaining about lost balances (NRT), or massive spikes in PostgreSQL `42P01` or `42703` errors.

### Immediate Actions:
1. **Identify the Scope**: Determine if the corruption is localized (e.g., a specific table like `tracking_sessions`) or widespread (e.g., deleted schema).
2. **Halt Writes (If Necessary)**:
   If malicious or accidental data deletion is ongoing, temporarily restrict database access:
   - Go to Supabase Dashboard -> Database -> Roles.
   - Temporarily revoke `INSERT`/`UPDATE`/`DELETE` from `authenticated` and `anon` roles.
3. **Restore from Point-in-Time Recovery (PITR)**:
   - Log in to the Supabase Dashboard.
   - Navigate to **Database > Backups**.
   - If you have PITR enabled (Pro/Enterprise tier), select the exact minute *before* the corruption occurred.
   - Initiate the restore. **Note**: This will incur downtime while the new database instance is spun up and data is restored.
4. **Post-Incident**:
   - Re-enable access roles.
   - Verify integrity of `wallets` and `transactions` tables to ensure financial ledger consistency.

---

## 2. API Key Leak (SP or ISP Compromised)

**Severity**: High
**Symptoms**: A Service Provider (SP) or Internet Service Provider (ISP) reports their SDK Key or Webhook Secret was pushed to a public GitHub repository, or you notice a massive anomaly in tracking events from a single IP/Service.

### Immediate Actions:
1. **Deactivate the Compromised Key**:
   Do NOT delete the key immediately, as you may need it for forensic auditing. Instead, mark it as inactive.
   ```sql
   -- For an SP Key
   UPDATE public.sp_api_keys 
   SET status = 'compromised' 
   WHERE sdk_key = '<COMPROMISED_KEY>';
   
   -- For an ISP Key
   UPDATE public.isp_api_keys 
   SET status = 'compromised' 
   WHERE sdk_key = '<COMPROMISED_KEY>';
   ```
2. **Identify Anomaly Traffic**:
   Query `tracking_sessions` and `device_data_sessions` for any events injected using this key since the suspected leak time. Flag or delete these events to prevent fraudulent NRT payouts.
3. **Generate a New Key**:
   - Through the Admin Dashboard or via SQL, generate a fresh `sdk_key` and `webhook_secret`.
   - Distribute the new key to the affected SP/ISP via a secure channel (e.g., encrypted email or secure portal).

---

## 3. Telemetry/Tracking Edge Function Outage or DDoS

**Severity**: High
**Symptoms**: Mobile apps, Chrome extensions, and SPs are unable to report bandwidth usage. The `/functions/v1/tracking` endpoint returns `503 Service Unavailable` or `546 Resource Limit`.

### Immediate Actions:
1. **Check Edge Runtime Logs**:
   - In Supabase Dashboard, go to **Edge Functions > tracking > Logs**.
   - Identify if the issue is a CPU timeout (`WORKER_LIMIT`), Memory limit (`BOOT_ERROR`), or a downstream Database timeout.
2. **Mitigate DDoS / Throttle Traffic**:
   - If under attack, ensure Supabase Network Restrictions (IP Allowlisting) are configured if applicable, though public tracking endpoints cannot easily IP-restrict.
   - Rely on the Redis/Upstash rate-limiting built into the Edge Function. If it is failing, increase the strictness of the rate limits in `tracking/index.ts` and deploy immediately:
     ```bash
     supabase functions deploy tracking --no-verify-jwt
     ```
3. **Client-Side Fallback**:
   - The NetReward SDKs (Chrome Extension / Mobile App) should be configured with **exponential backoff and local queuing**.
   - If the endpoint returns `5xx`, clients must queue the events in local storage/SQLite and retry when the system recovers. **No immediate action required on the server** if client queues are robust.

---

## 4. Third-Party Payment Gateway Failure (OPay / Fiat Withdrawals)

**Severity**: Medium to High
**Symptoms**: Users are requesting Fiat withdrawals (burning NRT for local currency), but the funds are not arriving. The database shows transactions stuck in `processing` or `pending`.

### Immediate Actions:
1. **Pause Withdrawals**:
   Temporarily disable the withdrawal system to prevent a backlog of failed transactions and user panic.
   ```sql
   UPDATE public.system_settings 
   SET withdrawals_enabled = false 
   WHERE id = 1;
   ```
2. **Check Webhooks**:
   Verify if the payment provider (e.g., OPay) is experiencing an outage via their status page. Check the Supabase webhook logs to see if callback payloads are failing.
3. **Manual Reconciliation**:
   Once the gateway is back online, run a reconciliation script to check the status of all `pending` withdrawals against the payment provider's API.
   - Update `status = 'completed'` for successful ones.
   - Update `status = 'failed'` and **refund the NRT back to the user's wallet** for failed ones.
4. **Re-enable Withdrawals**:
   Once verified, set `withdrawals_enabled = true` in `system_settings`.
