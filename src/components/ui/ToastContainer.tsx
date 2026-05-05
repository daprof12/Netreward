import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import type { ToastType } from '@/stores/useToastStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const getToastConfig = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500/10 border border-green-500/30 backdrop-blur-md',
          text: 'text-green-700',
          icon: <CheckCircle2 size={18} className="text-green-500" />
        };
      case 'warning':
        return {
          bg: 'bg-orange-500/10 border border-orange-500/30 backdrop-blur-md',
          text: 'text-orange-500',
          icon: <AlertTriangle size={18} className="text-orange-500" />
        };
      case 'danger':
      case 'error':
        return {
          bg: 'bg-red-500/10 border border-red-500/30 backdrop-blur-md',
          text: 'text-red-500',
          icon: <XCircle size={18} className="text-red-500" />
        };
      default:
        // Safe fallback to prevent crashes if an unknown type is passed
        return {
          bg: 'bg-gray-500/10 border border-gray-500/30 backdrop-blur-md',
          text: 'text-gray-500',
          icon: <AlertTriangle size={18} className="text-gray-500" />
        };
    }
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 w-full max-w-[90%] pointer-events-none items-center">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = getToastConfig(toast.type);

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`${config.bg} ${config.text} px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 w-max max-w-full pointer-events-auto cursor-pointer`}
              onClick={() => removeToast(toast.id)}
            >
              <div className="shrink-0">{config.icon}</div>
              <p className="text-sm font-semibold truncate leading-tight pr-2">{toast.message}</p>
              <button
                onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
                className="shrink-0 opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-black/10 ml-auto"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
