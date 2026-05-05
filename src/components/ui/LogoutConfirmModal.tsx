import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }: LogoutConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <LogOut size={24} />
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-bg-secondary text-text-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <h3 className="text-xl font-bold text-text-primary mb-2">Log Out</h3>
            <p className="text-sm text-text-secondary mb-6">
              Are you sure you want to log out? You will need to sign in again to access your account.
            </p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-bg-secondary text-text-primary font-bold text-sm border border-glass-border hover:bg-glass-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white font-bold text-sm shadow-lg shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-95"
              >
                Yes, Log Out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
