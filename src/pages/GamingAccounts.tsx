import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Plus, Pencil, Trash2, X, Check, Loader2,
  ArrowLeft, AlertTriangle, Link2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGamingAccounts, GAMING_PLATFORMS, type GamingPlatform } from '@/hooks/useGamingAccounts';
import { PlatformLogoCircle } from '@/components/ui/PlatformLogos';
import { useToastStore } from '@/stores/useToastStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import EmptyState from '@/components/ui/EmptyState';

const ALL_PLATFORMS = Object.keys(GAMING_PLATFORMS) as GamingPlatform[];

export default function GamingAccounts() {
  usePageTitle('Gaming Accounts');
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const {
    gamingAccounts, linkedPlatforms, isLoading,
    linkAccount, isLinking,
    unlinkAccount, isUnlinking,
    updateAccount, isUpdating,
  } = useGamingAccounts();

  // Link sheet state
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<GamingPlatform | null>(null);
  const [usernameInput, setUsernameInput] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');

  // Remove confirmation
  const [removingId, setRemovingId] = useState<string | null>(null);

  const availablePlatforms = ALL_PLATFORMS.filter(p => !linkedPlatforms.has(p));

  const handleLink = async () => {
    if (!selectedPlatform || !usernameInput.trim()) {
      showToast('Enter your username', 'warning');
      return;
    }
    try {
      await linkAccount({ platform: selectedPlatform, username: usernameInput });
      showToast(`${GAMING_PLATFORMS[selectedPlatform].label} account linked!`, 'success');
      setShowLinkSheet(false);
      setSelectedPlatform(null);
      setUsernameInput('');
    } catch (err: any) {
      if (err.code === '23505') {
        showToast('This platform is already linked', 'warning');
      } else {
        showToast(err.message || 'Failed to link account', 'danger');
      }
    }
  };

  const handleUpdate = async (accountId: string) => {
    if (!editUsername.trim()) return;
    try {
      await updateAccount({ accountId, username: editUsername });
      showToast('Username updated', 'success');
      setEditingId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'danger');
    }
  };

  const handleUnlink = async () => {
    if (!removingId) return;
    try {
      await unlinkAccount(removingId);
      showToast('Account unlinked', 'success');
      setRemovingId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to unlink', 'danger');
    }
  };

  return (
    <motion.div
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-bg-secondary rounded-full hover:bg-glass-border transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Gaming Accounts</h1>
          <p className="text-sm text-text-secondary mt-0.5">Link your console & mobile gaming accounts to earn NRT</p>
        </div>
        {availablePlatforms.length > 0 && (
          <button
            onClick={() => {
              setSelectedPlatform(availablePlatforms[0]);
              setUsernameInput('');
              setShowLinkSheet(true);
            }}
            className="p-2 bg-accent-primary text-primary-foreground rounded-full shadow-lg shadow-accent-primary/20 active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="glass rounded-xl border border-glass-border p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center shrink-0">
          <Gamepad2 size={20} className="text-accent-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">How it works</p>
          <p className="text-xs text-text-secondary leading-relaxed mt-0.5">
            Link your gaming accounts once and they'll be automatically detected when you join Gaming campaigns. Game publishers with NRT SDK will match your platform ID to reward you.
          </p>
        </div>
      </div>

      {/* Linked Accounts List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="glass rounded-xl border border-glass-border p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : gamingAccounts.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 size={28} />}
          title="No Gaming Accounts Linked"
          message="Link your PlayStation, Xbox, Steam, or other gaming platform accounts to start earning NRT on gaming campaigns."
          action={{
            label: 'Link Gaming Account',
            onClick: () => {
              setSelectedPlatform(availablePlatforms[0] || 'playstation');
              setUsernameInput('');
              setShowLinkSheet(true);
            },
          }}
        />
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider ml-1">
            Linked Platforms ({gamingAccounts.length}/{ALL_PLATFORMS.length})
          </h3>
          {gamingAccounts.map(account => {
            const meta = GAMING_PLATFORMS[account.platform];
            const isEditing = editingId === account.id;

            return (
              <motion.div
                layout
                key={account.id}
                className="glass rounded-xl border border-glass-border p-4 relative overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <PlatformLogoCircle platform={account.platform} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-text-primary text-sm">{meta.label}</h4>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-500 flex items-center gap-1">
                        <Link2 size={8} /> Linked
                      </span>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="text"
                          value={editUsername}
                          onChange={e => setEditUsername(e.target.value)}
                          placeholder={meta.usernamePlaceholder}
                          className="flex-1 bg-bg-secondary border border-glass-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-accent-primary"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdate(account.id)}
                          disabled={isUpdating}
                          className="p-1.5 bg-accent-primary text-primary-foreground rounded-lg"
                        >
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-bg-secondary text-text-secondary rounded-lg"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary mt-0.5">
                        <span className="font-medium text-text-primary">{meta.usernameLabel}:</span> {account.platform_username}
                      </p>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingId(account.id);
                          setEditUsername(account.platform_username);
                        }}
                        className="p-2 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setRemovingId(account.id)}
                        className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Link more prompt */}
          {availablePlatforms.length > 0 && (
            <button
              onClick={() => {
                setSelectedPlatform(availablePlatforms[0]);
                setUsernameInput('');
                setShowLinkSheet(true);
              }}
              className="w-full glass rounded-xl border border-dashed border-glass-border p-4 flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-accent-primary hover:border-accent-primary/50 transition-colors"
            >
              <Plus size={16} />
              Link another platform ({availablePlatforms.length} available)
            </button>
          )}
        </div>
      )}

      {/* ── Link Platform Bottom Sheet ──────────────────────────────────── */}
      <AnimatePresence>
        {showLinkSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLinkSheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md glass rounded-t-[24px] border-t border-glass-border flex flex-col max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Link Gaming Account</h3>
                  <button onClick={() => setShowLinkSheet(false)} className="p-1.5 bg-bg-secondary rounded-full">
                    <X size={16} />
                  </button>
                </div>

                {/* Platform Selector */}
                <div>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-wider mb-3">Select Platform</p>
                  <div className="grid grid-cols-2 gap-2">
                    {availablePlatforms.map(platform => {
                      const meta = GAMING_PLATFORMS[platform];
                      const isSelected = selectedPlatform === platform;
                      return (
                        <button
                          key={platform}
                          onClick={() => {
                            setSelectedPlatform(platform);
                            setUsernameInput('');
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            isSelected
                              ? 'bg-accent-primary/10 border-accent-primary ring-1 ring-accent-primary'
                              : 'glass border-glass-border hover:bg-glass-bg'
                          }`}
                        >
                          <PlatformLogoCircle platform={platform} size={32} iconSize={14} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-text-primary truncate">{meta.label}</p>
                          </div>
                          {isSelected && <Check size={16} className="text-accent-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Username Input */}
                {selectedPlatform && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider">
                      {GAMING_PLATFORMS[selectedPlatform].usernameLabel}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={e => setUsernameInput(e.target.value)}
                        placeholder={GAMING_PLATFORMS[selectedPlatform].usernamePlaceholder}
                        className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-text-secondary">
                      Enter the username you use on {GAMING_PLATFORMS[selectedPlatform].label}. Game publishers will use this to track your sessions.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Bottom CTA */}
              <div className="px-5 pt-4 pb-10 border-t border-glass-border/50">
                <button
                  onClick={handleLink}
                  disabled={isLinking || !selectedPlatform || !usernameInput.trim()}
                  className="w-full py-3.5 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {isLinking ? (
                    <><Loader2 size={16} className="animate-spin" /> Linking...</>
                  ) : (
                    <><Link2 size={16} /> Link Account</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Remove Confirmation Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {removingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !isUnlinking && setRemovingId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass max-w-sm w-full rounded-2xl border border-glass-border p-6 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Unlink Account?</h3>
              <p className="text-text-secondary text-sm text-center mb-6">
                This gaming platform will no longer be detected when joining campaigns. You can link it again later.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRemovingId(null)}
                  disabled={isUnlinking}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-bg-secondary text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-red-500 text-white shadow-lg shadow-red-500/20 flex items-center justify-center"
                >
                  {isUnlinking ? <Loader2 size={16} className="animate-spin" /> : 'Unlink'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
