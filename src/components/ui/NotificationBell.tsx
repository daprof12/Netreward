import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, ExternalLink, Package, CreditCard, ShieldAlert, MessageCircle } from 'lucide-react';
import { useNotificationStore, type Notification } from '@/stores/useNotificationStore';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return <CreditCard className="text-emerald-400" size={16} />;
      case 'campaign': return <Package className="text-blue-400" size={16} />;
      case 'p2p': return <MessageCircle className="text-purple-400" size={16} />;
      default: return <ShieldAlert className="text-amber-400" size={16} />;
    }
  };

  const handleNotificationClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-bg-secondary rounded-full hover:bg-glass-bg transition-colors"
      >
        <Bell size={20} className="text-text-primary" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 bg-red-500 text-[10px] font-bold text-white flex items-center justify-center rounded-full border-2 border-bg-primary">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 bg-bg-card border border-glass-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-glass-border flex justify-between items-center bg-bg-secondary/50">
              <h3 className="font-bold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-accent-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 bg-bg-secondary rounded-full flex items-center justify-center mx-auto opacity-20">
                    <Bell size={24} />
                  </div>
                  <p className="text-xs text-text-secondary">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-glass-border">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full p-4 flex gap-3 text-left transition-colors hover:bg-glass-bg ${!n.is_read ? 'bg-accent-primary/5' : ''}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-bg-secondary border border-glass-border`}>
                          {getIcon(n.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-xs font-bold truncate ${!n.is_read ? 'text-text-primary' : 'text-text-secondary'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-text-secondary shrink-0 whitespace-nowrap">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary line-clamp-2 mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        {n.link && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-accent-primary">
                            <span>View Details</span>
                            <ExternalLink size={10} />
                          </div>
                        )}
                      </div>
                      {!n.is_read && (
                        <div className="mt-1.5 shrink-0">
                          <div className="w-2 h-2 bg-accent-primary rounded-full shadow-[0_0_8px_var(--accent-primary)]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-3 border-t border-glass-border bg-bg-secondary/30 text-center">
                <button 
                  onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                  className="text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
