import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/useAuthStore';
import { ArrowRight, Coins, ShieldCheck, Wifi } from 'lucide-react';

const slides = [
  {
    title: "Earn passively",
    description: "Get rewarded with NRT tokens simply by using your favorite apps and consuming data.",
    icon: Coins,
  },
  {
    title: "Privacy first",
    description: "No credit cards, no data selling. Your internet habits remain completely private.",
    icon: ShieldCheck,
  },
  {
    title: "Seamless tracking",
    description: "Connect your devices once, and start earning instantly in the background.",
    icon: Wifi,
  }
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { setHasOnboarded } = useAuthStore();

  const handleNext = () => {
    if (currentSlide === slides.length - 1) {
      setHasOnboarded(true);
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-accent-primary/10 blur-[120px] pointer-events-none"></div>

      <div className="flex-1 flex flex-col justify-center items-center p-6 text-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center max-w-sm"
          >
            <div className="w-32 h-32 mb-8 rounded-3xl bg-gradient-to-br from-bg-secondary to-bg-card border border-glass-border shadow-2xl shadow-accent-primary/10 flex items-center justify-center">
              {(() => {
                const Icon = slides[currentSlide].icon;
                return <Icon size={64} className="text-accent-primary drop-shadow-md" />;
              })()}
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-4">
              {slides[currentSlide].title}
            </h2>
            <p className="text-text-secondary text-lg leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 pb-12 z-10 flex flex-col items-center">
        {/* Pagination Dots */}
        <div className="flex gap-2 mb-8">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-accent-primary' : 'w-2 bg-text-secondary/30'}`}
            />
          ))}
        </div>

        <button 
          onClick={handleNext}
          className="w-full max-w-sm flex items-center justify-center gap-2 bg-text-primary text-bg-primary font-semibold py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all"
        >
          {currentSlide === slides.length - 1 ? "Start Earning" : "Continue"}
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
