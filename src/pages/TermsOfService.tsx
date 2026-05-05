import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function TermsOfService() {
  usePageTitle('Terms of Service');
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
        <h1 className="text-xl font-bold">Terms of Service</h1>
        <div className="w-10" />
      </div>

      <div className="p-5 space-y-6 text-sm text-text-secondary">
        <div className="glass rounded-2xl p-5 border border-glass-border">
          <p className="font-semibold text-text-primary mb-2 text-base">1. Acceptance of Terms</p>
          <p className="leading-relaxed mb-4">
            By accessing and using the NetReward application, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>

          <p className="font-semibold text-text-primary mb-2 text-base">2. NRT Earning and Usage</p>
          <p className="leading-relaxed mb-4">
            NetReward Tokens (NRT) are earned by participating in campaigns, using background data services, and inviting friends. NRT is a utility token within our ecosystem. We reserve the right to modify the earning rate or adjust balances in cases of identified fraud or system manipulation.
          </p>

          <p className="font-semibold text-text-primary mb-2 text-base">3. User Verification (KYC)</p>
          <p className="leading-relaxed mb-4">
            Certain features, such as P2P trading, API access, and specific campaigns, require mandatory Know Your Customer (KYC) verification. You agree to provide accurate and truthful information during this process.
          </p>

          <p className="font-semibold text-text-primary mb-2 text-base">4. Service Provider (SP) and ISP Accounts</p>
          <p className="leading-relaxed mb-4">
            Users upgrading to SP or ISP status must provide verifiable corporate documents. NetReward reserves the right to suspend or revoke these statuses if the provided services violate local regulations or our community guidelines.
          </p>

          <p className="font-semibold text-text-primary mb-2 text-base">5. Account Security</p>
          <p className="leading-relaxed mb-4">
            You are responsible for maintaining the confidentiality of your login credentials and transaction PINs. NetReward is not liable for any loss of assets resulting from compromised accounts.
          </p>

          <p className="font-semibold text-text-primary mb-2 text-base">6. Termination</p>
          <p className="leading-relaxed">
            We reserve the right to terminate or suspend your account immediately, without prior notice or liability, for any reason, including but not limited to a breach of these Terms.
          </p>
        </div>
        
        <p className="text-center text-xs opacity-50 mt-8">Last updated: April 2026</p>
      </div>
    </motion.div>
  );
}
