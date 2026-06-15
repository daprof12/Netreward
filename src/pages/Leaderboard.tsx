import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Trophy, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { Skeleton } from '@/components/ui/skeleton';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [events, setEvents] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [entries, setEntries] = useState<any[]>([]);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data } = await supabase
          .from('leaderboard_events')
          .select('*')
          .order('end_time', { ascending: false });
        
        if (data && data.length > 0) {
          setEvents(data);
          // Auto select active event if exists, otherwise first
          const activeIdx = data.findIndex(e => e.status === 'active');
          setCurrentIndex(activeIdx !== -1 ? activeIdx : 0);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      }
    }
    fetchEvents();
  }, []);

  useEffect(() => {
    if (events.length === 0) {
      setLoading(false);
      return;
    }
    
    async function fetchEntries() {
      setLoading(true);
      try {
        const currentEvent = events[currentIndex];
        
        const { data } = await supabase
          .from('leaderboard_entries')
          .select('*, user:user_id(display_name, email, avatar_url)')
          .eq('event_id', currentEvent.id)
          .order('rank', { ascending: true })
          .limit(100);
        
        setEntries(data || []);

        if (user) {
          const myDat = data?.find(e => e.user_id === user.id);
          if (myDat) {
            setMyEntry(myDat);
          } else {
            // Fetch if not in top 100
            const { data: me } = await supabase
              .from('leaderboard_entries')
              .select('*, user:user_id(display_name, email, avatar_url)')
              .eq('event_id', currentEvent.id)
              .eq('user_id', user.id)
              .single();
            setMyEntry(me || null);
          }
        }
      } catch (err) {
        console.error('Error fetching entries:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEntries();
  }, [currentIndex, events, user]);

  const handlePrev = () => {
    if (currentIndex < events.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleNext = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (events.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
        <button onClick={() => navigate(-1)} className="absolute top-6 left-4 p-2 bg-bg-secondary rounded-full">
          <ChevronLeft size={20} />
        </button>
        <Trophy size={48} className="text-text-secondary opacity-30 mb-4" />
        <p className="text-lg font-bold">No Leaderboard Events</p>
        <p className="text-sm text-text-secondary mt-2">Check back later for new events and challenges!</p>
      </div>
    );
  }

  const currentEvent = events[currentIndex];

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col relative pb-24">
      {/* Header section (Blue background) */}
      <div className="bg-[#3FA2F6] text-white pt-8 pb-10 px-4 rounded-b-[40px] relative shrink-0">
        <div className="flex items-center justify-between relative z-10 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm">
            <ChevronLeft size={20} className="text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === events.length - 1}
              className="p-1 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              Event {events.length - currentIndex} of {events.length}
            </span>
            <button 
              onClick={handleNext} 
              disabled={currentIndex === 0}
              className="p-1 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center text-center relative z-10 mt-2">
          {/* 3D trophy image - generated */}
          <div className="w-32 h-32 mb-2 relative">
            <img src="/leaderboard-trophy.png" alt="Trophy" className="w-full h-full object-contain filter drop-shadow-2xl" />
          </div>
          
          <h1 className="text-3xl font-black mb-2 shadow-sm">Leaderboard</h1>
          <p className="text-sm text-white/90 max-w-[280px] leading-relaxed mb-1">
            {currentEvent?.description || "Join the challenge and earn rewards! Follow our social media for updates."}
          </p>
          <button className="text-xs font-bold text-white/80 hover:text-white flex items-center gap-1 transition-colors">
            Learn more <ChevronRight size={12} />
          </button>
        </div>

        {/* The 3 Stat Boxes inside header, overlapping bottom */}
        <div className="absolute -bottom-10 left-4 right-4 grid grid-cols-3 gap-2 z-20">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center justify-center border border-white/30 shadow-lg text-white">
            <div className="flex items-center gap-1 font-black text-lg">
              <Trophy size={14} className="text-yellow-300" /> {myEntry ? myEntry.rank.toLocaleString() : '-'}
            </div>
            <span className="text-[10px] font-medium opacity-80">my rank</span>
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center justify-center border border-white/30 shadow-lg text-white">
            <div className="flex items-center gap-1 font-black text-lg">
              $100
            </div>
            <span className="text-[10px] font-medium opacity-80 flex items-center gap-1">prize draw <Info size={10} /></span>
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center justify-center border border-white/30 shadow-lg text-white">
            <div className="flex items-center gap-1 font-black text-lg text-white">
              {myEntry ? myEntry.score.toLocaleString() : '-'}
            </div>
            <span className="text-[10px] font-medium opacity-80">{currentEvent?.event_type === 'nrt_spent' ? 'nrt spent' : 'earned'}</span>
          </div>
        </div>
      </div>

      {/* spacer for overlapping boxes */}
      <div className="h-14 shrink-0"></div>

      {/* Leaderboard List */}
      <div className="flex-1 px-4 mt-2">
        <h3 className="text-sm font-bold text-text-secondary mb-4 px-2">Leaderboard</h3>
        
        {loading ? (
          <div className="space-y-4 px-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-text-secondary text-sm">No entries yet.</p>
          </div>
        ) : (
          <div className="space-y-3 px-1 pb-10">
            {entries.map((entry, idx) => {
              const name = entry.user?.display_name || entry.user?.email?.split('@')[0] || 'User';
              const rank = entry.rank;
              const isTop3 = rank <= 3;
              
              // Map colors for top 3
              const rankColor = rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                                rank === 2 ? 'bg-gray-300 text-gray-800' :
                                rank === 3 ? 'bg-amber-600 text-amber-100' :
                                'bg-bg-secondary text-text-secondary';
              
              const isMe = user?.id === entry.user_id;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${isMe ? 'bg-bg-secondary/50 border border-glass-border' : 'hover:bg-bg-secondary/30'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${rankColor}`}>
                    {rank}
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-accent-primary/20 overflow-hidden shrink-0 flex items-center justify-center text-accent-primary font-bold">
                    {entry.user?.avatar_url ? (
                      <img src={entry.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      name[0].toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-text-primary truncate">{name}</p>
                      {isMe && <span className="bg-[#3FA2F6]/20 text-[#3FA2F6] text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">You</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-3 h-3 rounded-sm bg-accent-primary/20 flex items-center justify-center rotate-45">
                        <div className="w-1.5 h-1.5 rounded-[1px] bg-accent-primary" />
                      </div>
                      <span className="text-xs font-bold text-accent-primary">{entry.score.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-text-secondary">
                      {rank === 1 ? '$50,000' : rank === 2 ? '$10,000' : rank === 3 ? '$6,000' : rank === 4 ? '$5,000' : rank === 5 ? '$4,000' : '-'}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky footer for current user if not in top 5 */}
      {!loading && myEntry && myEntry.rank > 5 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="glass rounded-2xl p-4 border border-glass-border shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center text-sm font-black text-text-secondary opacity-50 shrink-0">
                {myEntry.rank > 999 ? '999+' : myEntry.rank}
              </div>
              
              <div className="w-10 h-10 rounded-full bg-accent-primary/20 overflow-hidden shrink-0 flex items-center justify-center text-accent-primary font-bold">
                 {myEntry.user?.avatar_url ? (
                    <img src={myEntry.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    (myEntry.user?.display_name || myEntry.user?.email || 'Y')[0].toUpperCase()
                  )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-text-primary truncate">{myEntry.user?.display_name || myEntry.user?.email?.split('@')[0] || 'You'}</p>
                  <span className="bg-[#3FA2F6]/20 text-[#3FA2F6] text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">You</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-3 h-3 rounded-sm bg-accent-primary/20 flex items-center justify-center rotate-45">
                    <div className="w-1.5 h-1.5 rounded-[1px] bg-accent-primary" />
                  </div>
                  <span className="text-xs font-bold text-accent-primary">{myEntry.score.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-bold text-text-secondary">Can win $100</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
