import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LeaderboardCard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<any>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myScore, setMyScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch active event
        const { data: events, error: eventErr } = await supabase
          .from('leaderboard_events')
          .select('*')
          .eq('status', 'active')
          .order('end_time', { ascending: true })
          .limit(1);

        if (eventErr) throw eventErr;
        
        let activeEvent = events && events.length > 0 ? events[0] : null;

        // If no active, try to get the last ended one
        if (!activeEvent) {
          const { data: endedEvents } = await supabase
            .from('leaderboard_events')
            .select('*')
            .eq('status', 'ended')
            .order('end_time', { ascending: false })
            .limit(1);
          if (endedEvents && endedEvents.length > 0) activeEvent = endedEvents[0];
        }

        setEvent(activeEvent);

        if (activeEvent && user) {
          // Fetch my rank
          const { data: entry } = await supabase
            .from('leaderboard_entries')
            .select('*')
            .eq('event_id', activeEvent.id)
            .eq('user_id', user.id)
            .single();
          
          if (entry) {
            setMyRank(entry.rank);
            setMyScore(entry.score);
          }
        }
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) return null;

  if (!event) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bg-card border border-glass-border rounded-2xl p-4 flex items-center justify-between mb-6 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary">
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Leaderboard</h3>
            <p className="text-xs text-text-secondary">View rankings and past events</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/leaderboard')}
          className="text-xs font-bold text-accent-primary flex items-center gap-1 hover:underline"
        >
          Open <ChevronRight size={14} />
        </button>
      </motion.div>
    );
  }

  const isEnded = event?.status === 'ended';
  const eventTitle = event?.title || "Season 1 has ended";
  const desc = event?.description || "Winners will receive prizes by June 30. Follow our social media handles for next season challenges.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-card border border-glass-border rounded-2xl shadow-lg overflow-hidden relative mb-6"
    >
      <div className="p-4 relative z-10">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
          {isEnded ? (
            <span className="flex items-center gap-1.5 bg-bg-secondary px-2 py-1 rounded-md"><Clock size={12} /> Event ended</span>
          ) : (
            <span className="flex items-center gap-1.5 bg-accent-primary/20 text-accent-primary px-2 py-1 rounded-md"><Trophy size={12} /> Active Event</span>
          )}
        </div>
        
        <h2 className="text-xl font-black text-text-primary mb-1">{eventTitle}</h2>
        <p className="text-xs text-text-secondary leading-relaxed mb-4">{desc}</p>
        
        {/* 3 Columns */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-bg-secondary/50 rounded-xl p-3 flex flex-col items-center justify-center border border-glass-border">
            <div className="flex items-center gap-1 text-orange-400 font-black text-lg">
              <Trophy size={14} /> {myRank ? myRank.toLocaleString() : '-'}
            </div>
            <span className="text-[10px] text-text-secondary font-medium">my rank</span>
          </div>
          <div className="bg-bg-secondary/50 rounded-xl p-3 flex flex-col items-center justify-center border border-glass-border">
            <div className="flex items-center gap-1 text-emerald-400 font-black text-lg">
              $100
            </div>
            <span className="text-[10px] text-text-secondary font-medium flex items-center gap-1">prize draw <span className="w-3 h-3 rounded-full bg-bg-primary flex items-center justify-center text-[8px] text-text-secondary">?</span></span>
          </div>
          <div className="bg-bg-secondary/50 rounded-xl p-3 flex flex-col items-center justify-center border border-glass-border">
            <div className="flex items-center gap-1 text-accent-primary font-black text-lg">
              {myScore > 0 ? myScore.toLocaleString() : '-'}
            </div>
            <span className="text-[10px] text-text-secondary font-medium">{event?.event_type === 'nrt_spent' ? 'nrt spent' : 'earned'}</span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between border-t border-glass-border pt-4">
          <div className="flex items-center -space-x-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`w-8 h-8 rounded-full border-2 border-bg-card bg-bg-secondary flex items-center justify-center text-[10px] font-bold text-text-secondary z-[${10-i}] overflow-hidden`}>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <button 
            onClick={() => navigate('/leaderboard')}
            className="flex items-center gap-1 text-sm font-bold text-text-secondary hover:text-accent-primary transition-colors"
          >
            Open Leaderboard <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
