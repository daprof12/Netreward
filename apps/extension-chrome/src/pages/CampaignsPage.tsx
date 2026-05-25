import { useEffect, useState } from 'react';
import { Zap, Check, Loader2, Gamepad2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useTrackingStore } from '../stores/useTrackingStore';
import { supabase } from '../lib/supabase';

export default function CampaignsPage() {
  const { profile } = useAuthStore();
  const { campaigns, fetchCampaigns, isTracking } = useTrackingStore();
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  // State for linking game account inline
  const [linkingCampaign, setLinkingCampaign] = useState<any>(null);
  const [gameAccountId, setGameAccountId] = useState('');
  const [linkingError, setLinkingError] = useState('');

  useEffect(() => {
    if (profile?.id) {
      fetchCampaigns(profile.id).then(() => setLoading(false));
    }
  }, [profile?.id]);

  const handleToggle = async (campaign: any) => {
    if (!profile?.id) return;

    // Simulate game category check
    // If campaign name includes 'game' or 'play', we treat it as a gaming campaign
    const isGamingCampaign = campaign.title.toLowerCase().includes('game') || campaign.title.toLowerCase().includes('play') || campaign.category === 'gaming';

    if (isGamingCampaign && !campaign.enrolled) {
      // Check if user has a linked account (Mock check)
      const hasLinkedAccount = false; // In a real app, we'd check profile.gaming_accounts or similar
      if (!hasLinkedAccount) {
        setLinkingCampaign(campaign);
        return;
      }
    }

    await performToggle(campaign);
  };

  const performToggle = async (campaign: any) => {
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

  const handleLinkAccount = async () => {
    if (!gameAccountId) {
      setLinkingError('Account ID is required');
      return;
    }
    
    // In a real app we'd save this to the DB
    setLinkingError('');
    const campaignToToggle = linkingCampaign;
    setLinkingCampaign(null);
    setGameAccountId('');
    
    await performToggle(campaignToToggle);
  };

  if (loading) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader2 size={24} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>Loading campaigns...</p>
      </div>
    );
  }

  if (linkingCampaign) {
    return (
      <div className="page fade-in" style={{ justifyContent: 'center', minHeight: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Link Gaming Account</h2>
          <button onClick={() => setLinkingCampaign(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Gamepad2 size={48} color="#ec4899" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            To activate <strong>{linkingCampaign.title}</strong>, please link your gaming account ID for this service.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">Game Account ID / Username</label>
            <input 
              className="input" 
              placeholder="e.g. PlayerOne123" 
              value={gameAccountId}
              onChange={(e) => setGameAccountId(e.target.value)}
              autoFocus
            />
          </div>
          
          {linkingError && (
            <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{linkingError}</p>
          )}

          <button className="btn-primary" onClick={handleLinkAccount} style={{ marginTop: 8 }}>
            Link Account & Activate
          </button>
        </div>
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
        {campaigns.map((campaign: any) => {
          const isActiveAndTracking = campaign.enrolled && isTracking;
          
          return (
            <div
              key={campaign.id}
              style={{
                position: 'relative',
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
              {/* Campaign Icon / Logo */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: campaign.logo_url ? 'transparent' : (campaign.enrolled ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid var(--glass-border)'
                }}>
                  {campaign.logo_url ? (
                    <img 
                      src={campaign.logo_url} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        // Fallback to text if image fails to load
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextSibling) {
                          (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback Initial / Icon */}
                  <div 
                    style={{ 
                      display: campaign.logo_url ? 'none' : 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: '100%',
                      fontSize: 18, fontWeight: 800, textTransform: 'uppercase',
                      color: campaign.enrolled ? '#6366f1' : 'var(--text-tertiary)'
                    }}
                  >
                    {campaign.target_app?.[0] || campaign.title?.[0] || '?'}
                  </div>
                </div>
                
                {/* Animated Pulsing Dot for Active Tracking Campaigns */}
                {isActiveAndTracking && (
                  <motion.div
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      border: '2px solid var(--bg-card)',
                      zIndex: 10
                    }}
                    animate={{
                      boxShadow: ['0 0 0 0 rgba(16, 185, 129, 0.7)', '0 0 0 6px rgba(16, 185, 129, 0)'],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {campaign.title}
                  {isActiveAndTracking && <span style={{ fontSize: 9, color: '#10b981', fontWeight: 800 }}>TRACKING</span>}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {campaign.category || 'General'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>•</span>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                    {Number(campaign.reward_rate_per_gb || 0).toFixed(2)} NRT/GB
                  </span>
                </div>
                {campaign.end_date && (
                  <p style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                    Ends {new Date(campaign.end_date).toLocaleDateString()}
                  </p>
                )}
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
          );
        })}
      </div>
    </div>
  );
}
