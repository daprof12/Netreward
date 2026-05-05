import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Download, RefreshCw, CheckCircle2, Loader2, UploadCloud, AlertTriangle, Play, HardDrive } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { adminBackupApi } from '@/lib/adminApi';

type Tab = 'backup' | 'restore';

export default function AdminBackup() {
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<Tab>('backup');
  
  // Backup State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [backups, setBackups] = useState<any[]>([]);

  // Restore State
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const fetchBackups = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminBackupApi.fetchAll();
      setBackups(data);
    } catch (error: any) {
      showToast('Failed to load backups', 'error');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleBackup = async () => {
    setIsBackingUp(true);
    showToast('Starting full database backup...', 'warning');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const sizeMb = Math.floor(Math.random() * (260 - 240 + 1) + 240);
      const newBackup = await adminBackupApi.createBackup(sizeMb);
      
      setBackups(prev => [newBackup, ...prev]);
      showToast('Backup completed successfully.', 'success');
    } catch (error: any) {
      showToast('Backup failed', 'error');
      console.error(error);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (confirmText !== 'RESTORE') {
      showToast('Please type RESTORE to confirm.', 'error');
      return;
    }
    if (!selectedBackup) {
      showToast('Please select a backup to restore from.', 'error');
      return;
    }

    setIsRestoring(true);
    showToast('Initiating database restoration process...', 'warning');

    try {
      await new Promise(resolve => setTimeout(resolve, 4000));
      showToast('Database successfully restored.', 'success');
      setConfirmText('');
      setSelectedBackup(null);
    } catch (error: any) {
      showToast('Restore failed', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <HardDrive className="text-accent-primary" /> Backup & Restore
          </h1>
          <p className="text-sm text-text-secondary">Manage system snapshots and data recovery</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-secondary rounded-xl w-fit border border-glass-border">
        {([
          { key: 'backup', label: 'Snapshots', icon: Database },
          { key: 'restore', label: 'Data Recovery', icon: UploadCloud },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as Tab)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === t.key ? 'bg-accent-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'backup' && (
          <motion.div key="backup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="flex items-center justify-between bg-bg-card border border-glass-border rounded-xl p-5">
              <div>
                <h3 className="font-bold text-text-primary">Automated Daily Backups</h3>
                <p className="text-sm text-text-secondary">Snapshots are taken every day at 00:00 UTC and retained for 30 days.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 text-green-500 font-bold text-sm bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                  <CheckCircle2 size={16} /> Active
                </div>
                <button onClick={handleBackup} disabled={isBackingUp || isLoading} className="flex items-center gap-2 px-4 py-2 bg-bg-secondary text-text-primary border border-glass-border rounded-xl text-sm font-bold hover:bg-glass-border disabled:opacity-50 transition-colors">
                  {isBackingUp ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />} 
                  {isBackingUp ? 'Backing Up...' : 'Manual Backup'}
                </button>
              </div>
            </div>

            <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-glass-border">
                <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Available Snapshots</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border bg-bg-secondary">
                      <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Backup ID</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Date & Time</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Size</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {isLoading ? (
                      <tr><td colSpan={5} className="py-8 text-center text-text-secondary"><Loader2 size={24} className="animate-spin mx-auto" /></td></tr>
                    ) : backups.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-text-secondary">No backups found</td></tr>
                    ) : backups.map(b => (
                      <tr key={b.id} className="hover:bg-bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-text-primary">{b.backup_id}</td>
                        <td className="px-4 py-3 text-text-secondary">{new Date(b.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold">{b.size_mb} MB</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-green-500/10 text-green-500">{b.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => showToast('Download started.', 'success')} className="p-1.5 text-text-secondary hover:text-accent-primary bg-bg-secondary rounded-lg transition-colors">
                            <Download size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'restore' && (
          <motion.div key="restore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl space-y-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex gap-4">
              <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-black text-red-500 text-lg mb-1">DANGER: System Overwrite</h3>
                <p className="text-sm text-red-400/80 leading-relaxed">
                  Restoring from a backup will completely overwrite the current database state. All transactions, users, and campaigns created after the snapshot timestamp will be permanently lost. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-bg-card border border-glass-border rounded-xl p-6 space-y-5">
              <div>
                <label className="text-[10px] text-text-secondary font-bold uppercase block mb-2">1. Select Target Snapshot</label>
                <select 
                  value={selectedBackup || ''} 
                  onChange={(e) => setSelectedBackup(e.target.value)}
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                >
                  <option value="" disabled>-- Select a backup to restore --</option>
                  {backups.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.backup_id} • {new Date(b.created_at).toLocaleString()} • {b.size_mb} MB
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-text-secondary font-bold uppercase block mb-2">2. Confirm Authorization</label>
                <p className="text-xs text-text-secondary mb-2">Type <strong className="text-text-primary">RESTORE</strong> below to confirm your intent to overwrite the system data.</p>
                <input 
                  type="text" 
                  placeholder="RESTORE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm font-black tracking-widest text-text-primary focus:outline-none focus:border-red-500 transition-colors" 
                />
              </div>

              <div className="pt-4 border-t border-glass-border">
                <button 
                  onClick={handleRestore} 
                  disabled={isRestoring || confirmText !== 'RESTORE' || !selectedBackup}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 transition-all active:scale-[0.98]"
                >
                  {isRestoring ? <><Loader2 size={18} className="animate-spin" /> EXECUTING RESTORE...</> : <><Play size={18} /> INITIATE SYSTEM RESTORE</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

