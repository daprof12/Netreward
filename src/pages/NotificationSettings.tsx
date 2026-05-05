import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Bell, Mail, Smartphone, 
  CreditCard, Package, MessageCircle, ShieldAlert,
  Check, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';

interface Preferences {
  push: boolean;
  email: boolean;
  in_app: boolean;
  types: {
    payment: boolean;
    campaign: boolean;
    p2p: boolean;
    system: boolean;
  };
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching preferences:', error);
        // Set defaults if column is missing or error occurs
        setPreferences({
          push: true,
          email: true,
          in_app: true,
          types: {
            payment: true,
            campaign: true,
            p2p: true,
            system: true
          }
        });
      } else if (data?.notification_preferences) {
        setPreferences(data.notification_preferences as Preferences);
      }
      setIsLoading(false);
    }

    fetchPreferences();
  }, [user]);

  const handleToggle = async (path: string, value: boolean) => {
    if (!preferences || !user) return;

    const newPrefs = { ...preferences };
    const parts = path.split('.');
    
    if (parts.length === 1) {
      (newPrefs as any)[parts[0]] = value;
    } else {
      (newPrefs as any)[parts[0]][parts[1]] = value;
    }

    setPreferences(newPrefs);
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_preferences: newPrefs })
        .eq('id', user.id);

      if (error) throw error;
      showToast('Preferences updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating preferences', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    {
      title: 'Channels',
      description: 'Choose how you want to receive alerts',
      items: [
        { icon: Smartphone, label: 'Push Notifications', path: 'push', value: preferences?.push },
        { icon: Mail, label: 'Email Alerts', path: 'email', value: preferences?.email },
        { icon: Bell, label: 'In-App Notifications', path: 'in_app', value: preferences?.in_app },
      ]
    },
    {
      title: 'Notification Types',
      description: 'Select the categories you care about',
      items: [
        { icon: CreditCard, label: 'Payments & Scan2Pay', path: 'types.payment', value: preferences?.types.payment },
        { icon: Package, label: 'New Campaigns', path: 'types.campaign', value: preferences?.types.campaign },
        { icon: MessageCircle, label: 'P2P Trades', path: 'types.p2p', value: preferences?.types.p2p },
        { icon: ShieldAlert, label: 'System & Security', path: 'types.system', value: preferences?.types.system },
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen pb-24"
    >
      {/* Header */}
      <div className="p-4 pt-8 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-bg-secondary rounded-full hover:bg-glass-bg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Notification Settings</h1>
      </div>

      <div className="px-4 space-y-8 mt-4">
        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">{section.title}</h2>
              <p className="text-xs text-text-secondary">{section.description}</p>
            </div>

            <div className="glass rounded-2xl border border-glass-border overflow-hidden divide-y divide-glass-border">
              {section.items.map((item) => (
                <div key={item.label} className="p-4 flex items-center justify-between bg-bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center text-text-secondary">
                      <item.icon size={20} />
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer scale-110">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={!!item.value}
                      onChange={() => handleToggle(item.path, !item.value)}
                      disabled={isSaving}
                    />
                    <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary shadow-sm"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="p-4 bg-accent-primary/5 border border-accent-primary/10 rounded-2xl">
          <p className="text-[10px] text-text-secondary leading-relaxed">
            Note: Critical security alerts and essential transaction confirmations cannot be disabled for your protection.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
