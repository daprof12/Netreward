import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function PrivacyPolicyFull() {
  usePageTitle('Privacy Policy');
  const navigate = useNavigate();

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
        <h1 className="text-xl font-bold">Privacy Policy</h1>
        <div className="w-10" />
      </div>

      <div className="p-5 space-y-6 text-sm text-text-secondary">
        <div className="glass rounded-2xl p-5 border border-glass-border">
          <p className="font-semibold text-text-primary mb-2 text-base">1. Information We Collect</p>
          <p className="leading-relaxed mb-4">
            We collect information you provide directly to us, such as when you create or modify your account, request support, complete KYC verification, or otherwise communicate with us. This includes your name, email, phone number, and government-issued ID.
          </p>

          <p className="font-semibold text-text-primary mb-2 text-base">2. Background & Foreground Data Tracking</p>
          <p className="leading-relaxed mb-4">
            To accurately reward you with NRT for your network usage, our application utilizes system-level APIs to monitor foreground and background data consumption. You may opt out of this tracking at any time via the Privacy Settings, however, doing so will pause your NRT earning capabilities for data-based campaigns.
          </p>

          <p className="font-semibold text-text-primary mb-2 text-base">3. How We Use Your Information</p>
          <p className="leading-relaxed mb-4">
            We use the information we collect to provide, maintain, and improve our services. We also use the information to process transactions, send related information (such as confirmations and receipts), and verify your identity to comply with Anti-Money Laundering (AML) regulations.
          </p>

          <p className="font-semibold text-text-primary mb-2 text-base">4. Information Sharing</p>
          <p className="leading-relaxed mb-4">
            We do not sell your personal data. We may share your information with trusted third-party vendors, consultants, and other service providers who need access to such information to carry out work on our behalf (such as identity verification services).
          </p>

          <p className="font-semibold text-text-primary mb-2 text-base">5. Data Security</p>
          <p className="leading-relaxed mb-4">
            NetReward utilizes industry-standard encryption protocols to protect your personal data and digital assets. While we take reasonable measures to protect your information, no security system is completely impenetrable.
          </p>

          <p className="font-semibold text-text-primary mb-2 text-base">6. Your Data Rights</p>
          <p className="leading-relaxed">
            You have the right to request access to, correction of, or deletion of your personal data. You can manage your preferences and consent settings directly within the app's settings menu.
          </p>
        </div>
        
        <p className="text-center text-xs opacity-50 mt-8">Last updated: April 2026</p>
      </div>
    </motion.div>
  );
}
