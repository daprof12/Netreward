import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

const slides = [
  {
    title: 'Welcome to NetReward',
    description: 'Earn NRT automatically by sharing anonymized network data while you browse.',
    icon: <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <img src="/icons/icon-128.png" alt="NetReward Logo" style={{ width: 40, height: 40 }} />
          </div>
  },
  {
    title: 'Seamless Tracking',
    description: 'Our extension securely measures bandwidth usage in the background without affecting performance.',
    icon: <Zap size={48} color="var(--accent-primary)" style={{ margin: '0 auto' }} />
  },
  {
    title: 'Privacy First',
    description: 'We only track connection metrics. Your personal browsing history and data are never collected.',
    icon: <Shield size={48} color="#10b981" style={{ margin: '0 auto' }} />
  }
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const { completeOnboarding } = useAuthStore();

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 20px', justifyContent: 'space-between' }}>
      
      {/* Top Progress Indicators */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
        {slides.map((_, i) => (
          <div key={i} style={{ 
            height: 4, flex: 1, borderRadius: 2, 
            background: i <= step ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s'
          }} />
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ marginBottom: 24 }}>
            {slides[step].icon}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>
            {slides[step].title}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, padding: '0 10px' }}>
            {slides[step].description}
          </p>
        </motion.div>
      </div>

      <button onClick={handleNext} className="btn-primary" style={{ marginTop: 24, padding: 14 }}>
        {step === slides.length - 1 ? (
          <>
            <CheckCircle2 size={18} />
            Get Started
          </>
        ) : (
          <>
            Continue
            <ArrowRight size={18} />
          </>
        )}
      </button>

    </div>
  );
}
