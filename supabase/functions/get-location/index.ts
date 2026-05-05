import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * get-location
 * 
 * Securely detects user's IP, Country, and ISP using server-side headers.
 * This avoids CORS issues and client-side rate limits.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get IP from Supabase headers
    const ip = req.headers.get('x-real-ip') || 'Unknown';
    
    // 2. Fetch Geo data using a server-side call (no CORS issues here)
    // Using a more reliable server-to-server endpoint
    const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
    const geoData = await geoResponse.json();

    return new Response(JSON.stringify({
      ip: ip,
      country: geoData.country_name || 'Unknown',
      isp: geoData.org || 'Unknown ISP',
      city: geoData.city || 'Unknown'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
