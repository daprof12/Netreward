import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Mail, Phone, Lock, Save, Camera, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useSpStore } from '@/stores/useSpStore';
import { useIspStore } from '@/stores/useIspStore';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function ProfileSettings() {
  usePageTitle('Profile');
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const { updateProfile, isUpdating } = useProfile();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Form State
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuggestion, setNameSuggestion] = useState<string | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);

  useEffect(() => {
    if (!displayName || displayName.trim() === profile?.display_name) {
      setNameError(null);
      setNameSuggestion(null);
      return;
    }

    if (displayName.trim().length < 2) {
      setNameError('Display name must be at least 2 characters');
      setNameSuggestion(null);
      return;
    }

    const checkName = async () => {
      setIsCheckingName(true);
      try {
        const { data, error } = await supabase.rpc('check_display_name_availability', {
          p_display_name: displayName.trim()
        });
        
        if (error) throw error;
        
        if (data && !data.available) {
          setNameError('Display name is taken');
          if (data.suggestion) {
            setNameSuggestion(data.suggestion);
          }
        } else {
          setNameError(null);
          setNameSuggestion(null);
        }
      } catch (err) {
        console.error('Error checking display name:', err);
      } finally {
        setIsCheckingName(false);
      }
    };

    const timeoutId = setTimeout(checkName, 500);
    return () => clearTimeout(timeoutId);
  }, [displayName, profile?.display_name]);

  const role = useAuthStore(state => state.role);
  const spLogo = useSpStore(state => state.profileLogo);
  const ispLogo = useIspStore(state => state.profileLogo);
  const initializeIsp = useIspStore(state => state.initialize);
  const initializeSp = useSpStore(state => state.initialize);
  
  useEffect(() => {
    if (user?.id) {
      if (role === 'isp') {
        initializeIsp(user.id);
      } else if (role === 'sp') {
        initializeSp(user.id);
      }
    }
  }, [user?.id, role, initializeIsp, initializeSp]);

  // Custom logo update functions
  const updateSpLogo = async (url: string) => {
    const { data: profile } = await supabase.from('sp_profiles').select('id').eq('user_id', user?.id).single();
    if (profile) {
      await supabase.from('sp_profiles').update({ logo_url: url }).eq('id', profile.id);
      await useSpStore.getState().initialize(user?.id || '');
    }
  };

  const updateIspLogo = async (url: string) => {
    const { data: profile } = await supabase.from('isp_profiles').select('id').eq('user_id', user?.id).single();
    if (profile) {
      await supabase.from('isp_profiles').update({ logo_url: url }).eq('id', profile.id);
      await useIspStore.getState().initialize(user?.id || '');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      if (role === 'sp') {
        await updateSpLogo(base64);
      } else if (role === 'isp') {
        await updateIspLogo(base64);
      } else {
        // Regular user avatar update
        await updateProfile({ avatar_url: base64 });
      }
      showToast('Profile image updated successfully', 'success');
    } catch (error: any) {
      console.error('Logo upload error:', error);
      showToast(error.message || 'Failed to update image', 'danger');
    } finally {
      setIsUploadingLogo(false);
      // Reset input value so same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError) {
      showToast('Please fix the errors before saving', 'danger');
      return;
    }
    try {
      await updateProfile({
        display_name: displayName,
        phone: phone,
      });
      showToast('Profile updated successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile', 'danger');
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'danger');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      // In Supabase, you can't verify current password directly via updateUser, 
      // but you can just update the password. If you want strict verification,
      // you'd re-authenticate. Here we just update it.
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      showToast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast(error.message || 'Failed to change password', 'danger');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <motion.div 
      className="min-h-screen bg-bg-primary pb-24"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-lg border-b border-glass-border px-4 py-4 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-primary hover:bg-glass-bg transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Profile Information</h1>
        <div className="w-10" />
      </div>

      <div className="p-4 space-y-6">
        <div className="flex flex-col items-center mt-4">
          <div className="relative group">
            <input 
              type="file" 
              id="logo-upload" 
              className="hidden" 
              accept="image/*"
              onChange={handleLogoUpload}
            />
            <div className="w-24 h-24 rounded-full bg-accent-primary flex items-center justify-center text-primary-foreground text-4xl font-bold shadow-lg shadow-accent-primary/20 overflow-hidden relative">
              {isUploadingLogo && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <Loader2 size={24} className="animate-spin text-white" />
                </div>
              )}
              {(role === 'sp' ? spLogo : role === 'isp' ? ispLogo : profile?.avatar_url) ? (
                <img 
                  src={(role === 'sp' ? spLogo : role === 'isp' ? ispLogo : profile?.avatar_url)!} 
                  alt="" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase() || '?'
              )}
            </div>
            <label 
              htmlFor="logo-upload"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-bg-secondary border-2 border-bg-primary flex items-center justify-center text-text-primary shadow-sm active:scale-95 transition-transform cursor-pointer hover:bg-glass-bg"
            >
              <Camera size={14} />
            </label>
          </div>
          <h2 className="text-xl font-bold mt-4">{profile?.display_name || user?.email?.split('@')[0] || 'User'}</h2>
          <p className="text-sm text-text-secondary">{user?.email}</p>
        </div>

        <div className="flex bg-bg-secondary p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'profile' ? 'bg-bg-primary shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'password' ? 'bg-bg-primary shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Password
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'profile' ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary ml-1">Display Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={18} className="text-text-secondary" />
                  </div>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    className={`w-full bg-bg-secondary border ${nameError ? 'border-red-500' : 'border-glass-border'} rounded-xl py-3.5 pl-11 pr-10 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50`}
                  />
                  {isCheckingName && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-text-secondary" />
                    </div>
                  )}
                </div>
                {nameError && (
                  <div className="mt-1 ml-1">
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle size={12} /> {nameError}
                    </p>
                    {nameSuggestion && (
                      <p className="text-xs text-text-secondary mt-1">
                        Suggestion:{' '}
                        <button 
                          type="button"
                          onClick={() => {
                            setDisplayName(nameSuggestion);
                            setNameError(null);
                            setNameSuggestion(null);
                          }}
                          className="text-accent-primary font-bold hover:underline"
                        >
                          {nameSuggestion}
                        </button>
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-text-secondary ml-1">This is how your name will appear publicly.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className="text-text-secondary" />
                  </div>
                  <input 
                    type="email" 
                    value={user?.email || ''}
                    readOnly
                    className="w-full bg-bg-secondary/50 border border-glass-border rounded-xl py-3.5 pl-11 pr-4 text-text-secondary cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-accent-primary ml-1">Contact support to change email</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary ml-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone size={18} className="text-text-secondary" />
                  </div>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl py-3.5 pl-11 pr-4 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isUpdating || !!nameError || isCheckingName}
                className="w-full mt-6 py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {isUpdating ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary ml-1">Current Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-text-secondary" />
                  </div>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl py-3.5 pl-11 pr-4 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary ml-1">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-text-secondary" />
                  </div>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl py-3.5 pl-11 pr-4 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary ml-1">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-text-secondary" />
                  </div>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl py-3.5 pl-11 pr-4 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full mt-6 py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {isUpdatingPassword ? <Loader2 size={20} className="animate-spin" /> : <Lock size={20} />}
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
