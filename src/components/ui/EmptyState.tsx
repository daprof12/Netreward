import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({ icon, title, message, action, className = '' }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-glass-border bg-bg-secondary/20 ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-bg-secondary/50 flex items-center justify-center text-text-secondary/50 mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-secondary max-w-[250px] leading-relaxed mb-5">
        {message}
      </p>
      
      {action && (
        <button 
          onClick={action.onClick}
          className="px-5 py-2 text-xs font-bold bg-accent-primary/10 text-accent-primary border border-accent-primary/20 rounded-lg hover:bg-accent-primary/20 transition-colors active:scale-95"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
