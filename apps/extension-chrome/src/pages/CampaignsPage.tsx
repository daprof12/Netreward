import { useEffect, useState } from 'react';
import { Zap, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useTrackingStore } from '../stores/useTrackingStore';
import { supabase } from '../lib/supabase';

export default function CampaignsPage() {
  const { profile } = useAuthStore();
  const { campaigns, fetchCampaigns } = useTrackingStore();
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchCampaigns(profile.id).then(() => setLoading(false));
    }
  }, [profile?.id]);

  const handleToggle = async (campaign: any) => {
    if (!profile?.id) return;
    setEnrolling(campaign.id);

    try {
      if (campaign.enrolled) {
        // Unenroll
        await supabase
          .from('user_campaigns')
          .update({ status: 'inactive' })
          .eq('user_id', profile.id)
          .eq('campaign_id', campaign.id);
      } else {
        // Enroll
        await supabase
          .from('user_campaigns')
          .upsert({
            user_id: profile.id,
            campaign_id: campaign.id,
            status: 'active',
            enrolled_at: new Date().toISOString(),
          });
      }
      await fetchCampaigns(profile.id);
    } catch (e) {
      console.error('Toggle campaign:', e);
    } finally {
      setEnrolling(null);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader2 size={24} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 900 }}>Campaigns</h2>
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
          {campaigns.filter(c => c.enrolled).length} active · {campaigns.length} available
        </p>
      </div>

      {campaigns.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          <Zap size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
          <p style={{ fontSize: 12 }}>No campaigns available</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {campaigns.map((campaign: any) => (
          <div
            key={campaign.id}
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${campaign.enrolled ? 'rgba(99,102,241,0.3)' : 'var(--glass-border)'}`,
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'all 0.2s ease',
            }}
          >
            {/* Campaign Icon */}
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: campaign.enrolled ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {campaign.enrolled
                ? <Check size={16} color="#6366f1" />
                : <Zap size={16} color="var(--text-tertiary)" />
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {campaign.title}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                {Number(campaign.reward_rate_per_gb || 0).toFixed(2)} NRT/GB
              </p>
            </div>

            {/* Toggle */}
            <div
              className={`toggle ${campaign.enrolled ? 'active' : ''}`}
              onClick={() => enrolling !== campaign.id && handleToggle(campaign)}
              style={{ opacity: enrolling === campaign.id ? 0.5 : 1, pointerEvents: enrolling === campaign.id ? 'none' : 'auto' }}
            >
              <div className="toggle-dot" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
