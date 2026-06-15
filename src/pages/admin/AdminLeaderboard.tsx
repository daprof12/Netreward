import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, Edit2, Trash2, Calendar, Target, Award, Search, Filter, X, Eye, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';

interface LeaderboardEvent {
  id: string;
  title: string;
  description: string;
  event_type: 'campaign_earned' | 'referrals' | 'nrt_spent';
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'active' | 'ended';
  prizes: any[];
  conditions: any;
  is_distributed?: boolean;
  created_at: string;
}

export default function AdminLeaderboard() {
  const [events, setEvents] = useState<LeaderboardEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<LeaderboardEvent | null>(null);
  const [eventEntries, setEventEntries] = useState<any[]>([]);
  const [isDistributing, setIsDistributing] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LeaderboardEvent | null>(null);
  const { showToast } = useToastStore();

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'campaign_earned',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    status: 'upcoming',
  });
  const [prizes, setPrizes] = useState<any[]>([{ startRank: 1, endRank: 1, reward: '50000' }]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaderboard_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      // In case the table doesn't exist yet, we will just show empty array without crashing hard.
      console.error('Error fetching leaderboard events:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        event_type: formData.event_type,
        status: formData.status,
        start_time: new Date(`${formData.start_date}T${formData.start_time}`).toISOString(),
        end_time: new Date(`${formData.end_date}T${formData.end_time}`).toISOString(),
        prizes: prizes
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('leaderboard_events')
          .update(payload)
          .eq('id', editingEvent.id);
        if (error) throw error;
        showToast('Event updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('leaderboard_events')
          .insert([payload]);
        if (error) throw error;
        showToast('Event created successfully', 'success');
      }
      setShowModal(false);
      fetchEvents();
    } catch (error: any) {
      showToast(error.message || 'An error occurred', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const { error } = await supabase.from('leaderboard_events').delete().eq('id', id);
      if (error) throw error;
      showToast('Event deleted', 'success');
      fetchEvents();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const openModal = (evt?: LeaderboardEvent) => {
    if (evt) {
      setEditingEvent(evt);
      const startD = new Date(evt.start_time);
      const endD = new Date(evt.end_time);
      setFormData({
        title: evt.title,
        description: evt.description || '',
        event_type: evt.event_type,
        start_date: startD.toISOString().split('T')[0],
        start_time: startD.toISOString().split('T')[1].slice(0, 5),
        end_date: endD.toISOString().split('T')[0],
        end_time: endD.toISOString().split('T')[1].slice(0, 5),
        status: evt.status,
      });
      setPrizes(evt.prizes && evt.prizes.length > 0 ? evt.prizes : [{ startRank: 1, endRank: 1, reward: '50000' }]);
    } else {
      setEditingEvent(null);
      const now = new Date();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setFormData({
        title: '',
        description: '',
        event_type: 'campaign_earned',
        start_date: now.toISOString().split('T')[0],
        start_time: now.toISOString().split('T')[1].slice(0, 5),
        end_date: nextWeek.toISOString().split('T')[0],
        end_time: nextWeek.toISOString().split('T')[1].slice(0, 5),
        status: 'upcoming',
      });
      setPrizes([{ startRank: 1, endRank: 1, reward: '50000' }]);
    }
    setShowModal(true);
  };

  const openViewModal = async (evt: LeaderboardEvent) => {
    setViewingEvent(evt);
    setEventEntries([]);
    try {
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .select('*, user:user_id(display_name, email, avatar_url)')
        .eq('event_id', evt.id)
        .order('rank', { ascending: true });
      if (error) throw error;
      setEventEntries(data || []);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDistribute = async () => {
    if (!viewingEvent) return;
    if (!window.confirm('Are you sure you want to distribute rewards? This will deduct NRT from the Admin Treasury and cannot be undone.')) return;
    
    setIsDistributing(true);
    try {
      const { data, error } = await supabase.rpc('distribute_leaderboard_rewards', { p_event_id: viewingEvent.id });
      if (error) throw error;
      if (data && data.success) {
        showToast(`Successfully distributed ${data.total_payout} NRT`, 'success');
        setViewingEvent({ ...viewingEvent, is_distributed: true });
        fetchEvents();
      } else {
        showToast(data?.error || 'Failed to distribute', 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-3">
            <Trophy className="text-accent-primary" size={28} />
            Leaderboard Management
          </h1>
          <p className="text-sm text-text-secondary mt-1">Create and manage competitive events for users</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl font-bold hover:shadow-lg hover:shadow-accent-primary/30 transition-all active:scale-95"
        >
          <Plus size={18} />
          Create Event
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Trophy, label: 'Total Events', value: events.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: Target, label: 'Active', value: events.filter(e => e.status === 'active').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: Calendar, label: 'Upcoming', value: events.filter(e => e.status === 'upcoming').length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
          { icon: Award, label: 'Ended', value: events.filter(e => e.status === 'ended').length.toString(), color: '#8b5cf6', bg: 'bg-purple-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="glass p-4 rounded-2xl border border-glass-border">
            <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} style={{ color }} />
            </div>
            <p className="text-xs text-text-secondary font-medium">{label}</p>
            <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl border border-glass-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg-secondary/50 text-text-secondary font-bold border-b border-glass-border">
              <tr>
                <th className="px-6 py-4">Event Details</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-secondary">Loading events...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-secondary">No leaderboard events found.</td></tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-text-primary">{evt.title}</p>
                      <p className="text-xs text-text-secondary mt-1 max-w-xs truncate">{evt.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-bg-secondary text-xs font-bold capitalize">
                        {evt.event_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-text-secondary space-y-1">
                      <div className="flex items-center gap-2"><Calendar size={12} /> {new Date(evt.start_time).toLocaleDateString()}</div>
                      <div className="flex items-center gap-2"><Target size={12} /> {new Date(evt.end_time).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${
                        evt.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        evt.status === 'ended' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openViewModal(evt)} className="p-2 text-text-secondary hover:text-accent-primary hover:bg-bg-secondary rounded-lg transition-colors" title="View details & participants">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openModal(evt)} className="p-2 text-text-secondary hover:text-accent-primary hover:bg-bg-secondary rounded-lg transition-colors" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(evt.id)} className="p-2 text-text-secondary hover:text-red-400 hover:bg-bg-secondary rounded-lg transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-bg-card border border-glass-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-glass-border flex justify-between items-center bg-bg-secondary/30 shrink-0">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <Trophy className="text-accent-primary" size={24} />
                  {editingEvent ? 'Edit Event' : 'Create Event'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-text-secondary hover:bg-bg-secondary rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="eventForm" onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Title</label>
                    <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors" placeholder="e.g., Season 1 Challenge" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Description</label>
                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors resize-none" placeholder="Winner will receive prize by June 30..."></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Event Type</label>
                      <select value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value as any})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors appearance-none">
                        <option value="campaign_earned">Campaign Earned</option>
                        <option value="referrals">Referrals</option>
                        <option value="nrt_spent">NRT Spent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors appearance-none">
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="ended">Ended</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Start Date</label>
                      <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Start Time</label>
                      <input type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors [color-scheme:dark]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">End Date</label>
                      <input type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">End Time</label>
                      <input type="time" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors [color-scheme:dark]" />
                    </div>
                  </div>

                  {/* Prizes Section */}
                  <div className="pt-2 border-t border-glass-border">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Prize Tiers</label>
                      <button 
                        type="button" 
                        onClick={() => setPrizes([...prizes, { startRank: prizes[prizes.length-1]?.endRank + 1 || 1, endRank: prizes[prizes.length-1]?.endRank + 5 || 5, reward: '1000' }])}
                        className="text-[10px] bg-bg-secondary hover:bg-accent-primary hover:text-white transition-colors px-2 py-1 rounded text-text-secondary font-bold flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Tier
                      </button>
                    </div>
                    <div className="space-y-2">
                      {prizes.map((prize, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="number" required placeholder="From Rank" value={prize.startRank} onChange={e => {
                            const newPrizes = [...prizes];
                            newPrizes[idx].startRank = parseInt(e.target.value) || 1;
                            setPrizes(newPrizes);
                          }} className="w-20 bg-bg-secondary border border-glass-border rounded-lg px-2 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-primary" />
                          <span className="text-text-secondary text-xs">-</span>
                          <input type="number" required placeholder="To Rank" value={prize.endRank} onChange={e => {
                            const newPrizes = [...prizes];
                            newPrizes[idx].endRank = parseInt(e.target.value) || 1;
                            setPrizes(newPrizes);
                          }} className="w-20 bg-bg-secondary border border-glass-border rounded-lg px-2 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-primary" />
                          <div className="flex-1 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-secondary">NRT</span>
                            <input type="text" required placeholder="Reward Amount" value={prize.reward} onChange={e => {
                              const newPrizes = [...prizes];
                              newPrizes[idx].reward = e.target.value;
                              setPrizes(newPrizes);
                            }} className="w-full bg-bg-secondary border border-glass-border rounded-lg pl-8 pr-2 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-primary" />
                          </div>
                          <button type="button" onClick={() => {
                            const newPrizes = prizes.filter((_, i) => i !== idx);
                            setPrizes(newPrizes);
                          }} className="p-2 text-text-secondary hover:text-red-400 rounded transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {prizes.length === 0 && <p className="text-xs text-text-secondary text-center py-2">No prizes configured. Users will just be ranked.</p>}
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-glass-border bg-bg-secondary/30 shrink-0 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-secondary transition-colors">
                  Cancel
                </button>
                <button type="submit" form="eventForm" className="px-6 py-2.5 bg-accent-primary text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-accent-primary/30 transition-all active:scale-95">
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingEvent(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-bg-card border border-glass-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-glass-border flex justify-between items-center bg-bg-secondary/30 shrink-0">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <Eye className="text-accent-primary" size={24} />
                  {viewingEvent.title}
                </h2>
                <div className="flex items-center gap-4">
                  {viewingEvent.status === 'ended' && !viewingEvent.is_distributed && (
                    <button 
                      onClick={handleDistribute} 
                      disabled={isDistributing}
                      className="px-4 py-2 bg-emerald-500/20 text-emerald-500 rounded-lg text-sm font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      {isDistributing ? 'Distributing...' : 'Distribute Rewards'}
                    </button>
                  )}
                  {viewingEvent.status === 'ended' && viewingEvent.is_distributed && (
                    <span className="px-4 py-2 bg-gray-500/10 text-text-secondary rounded-lg text-sm font-bold flex items-center gap-2">
                      <Award size={16} /> Rewards Distributed
                    </span>
                  )}
                  <button onClick={() => setViewingEvent(null)} className="p-2 text-text-secondary hover:bg-bg-secondary rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-bg-primary">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="col-span-1 glass p-4 rounded-2xl border border-glass-border space-y-4">
                    <div>
                      <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-1">Status</p>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize inline-block ${
                        viewingEvent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        viewingEvent.status === 'ended' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {viewingEvent.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-1">Type</p>
                      <p className="text-sm font-bold text-text-primary capitalize">{viewingEvent.event_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-1">Timeline</p>
                      <p className="text-xs text-text-secondary"><span className="text-text-primary">Starts:</span> {new Date(viewingEvent.start_time).toLocaleString()}</p>
                      <p className="text-xs text-text-secondary"><span className="text-text-primary">Ends:</span> {new Date(viewingEvent.end_time).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="col-span-2 glass p-4 rounded-2xl border border-glass-border">
                    <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-3">Prize Tiers</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {viewingEvent.prizes?.map((p, idx) => (
                        <div key={idx} className="bg-bg-secondary/50 p-2 rounded-xl flex items-center justify-between">
                          <span className="text-xs text-text-secondary font-medium">Rank {p.startRank} - {p.endRank}</span>
                          <span className="text-sm font-bold text-accent-primary">{Number(p.reward).toLocaleString()} NRT</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
                  <Users size={20} /> Participants ({eventEntries.length})
                </h3>

                <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-bg-secondary/50 text-text-secondary font-bold border-b border-glass-border">
                        <tr>
                          <th className="px-6 py-4 w-20">Rank</th>
                          <th className="px-6 py-4">User</th>
                          <th className="px-6 py-4">Score</th>
                          <th className="px-6 py-4 text-right">Reward Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass-border">
                        {eventEntries.length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-8 text-center text-text-secondary">No participants yet.</td></tr>
                        ) : (
                          eventEntries.map(entry => (
                            <tr key={entry.id} className="hover:bg-bg-secondary/30 transition-colors">
                              <td className="px-6 py-4">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                                  entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                                  entry.rank === 2 ? 'bg-gray-300 text-gray-800' :
                                  entry.rank === 3 ? 'bg-amber-600 text-amber-100' :
                                  'bg-bg-secondary text-text-secondary'
                                }`}>
                                  {entry.rank}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-accent-primary/20 overflow-hidden shrink-0 flex items-center justify-center text-accent-primary font-bold">
                                    {entry.user?.avatar_url ? (
                                      <img src={entry.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      (entry.user?.display_name || entry.user?.email || 'U')[0].toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-text-primary">{entry.user?.display_name || 'Anonymous'}</p>
                                    <p className="text-xs text-text-secondary">{entry.user?.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-bold text-text-primary">
                                {entry.score.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-accent-primary">
                                {entry.reward_amount ? `${Number(entry.reward_amount).toLocaleString()} NRT` : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
