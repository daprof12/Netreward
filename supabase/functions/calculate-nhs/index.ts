import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Gather Signals
    // This is a simplified version of the logic - in production these would be complex queries
    const [
      { count: activeCampaigns },
      { data: ispStats },
      { data: recentTx },
      { count: activeUsers }
    ] = await Promise.all([
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('isp_network_stats').select('throughput_gbps').order('recorded_at', { ascending: false }).limit(1),
      supabase.from('transactions').select('nrt_amount').eq('type', 'deposit').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ])

    // 2. Normalize Signals (0-100 scale)
    const demandSignal = Math.min(100, (activeCampaigns || 0) * 10)
    const flowSignal = Math.min(100, (ispStats?.[0]?.throughput_gbps || 0) / 10)
    const purchaseSignal = Math.min(100, (recentTx?.reduce((s, t) => s + Number(t.nrt_amount), 0) || 0) / 1000)
    const engagementSignal = Math.min(100, (activeUsers || 0) / 100)

    // 3. Weighted Formula
    const weights = {
      demand: 0.30,
      flow: 0.25,
      purchase: 0.25,
      engagement: 0.20
    }

    const nhsScore = (demandSignal * weights.demand) +
                     (flowSignal * weights.flow) +
                     (purchaseSignal * weights.purchase) +
                     (engagementSignal * weights.engagement)

    const finalScore = Math.round(Math.max(0, Math.min(100, nhsScore)))

    // 4. Update History & Global Multiplier
    const { data: history, error: historyErr } = await supabase
      .from('nhs_history')
      .insert({
        score: finalScore,
        inputs: { demandSignal, flowSignal, purchaseSignal, engagementSignal },
        calculated_at: new Date().toISOString()
      })
      .select()

    // 5. Update Global Settings (if applicable) or trigger cache invalidation
    // In this ecosystem, the dashboard reads from nhs_history (latest)

    return new Response(
      JSON.stringify({ success: true, score: finalScore, history }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
