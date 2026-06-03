import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({ text, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        if (textWidth > containerWidth) {
          setScrollDistance(textWidth - containerWidth);
        } else {
          setScrollDistance(0);
        }
      }
    };

    // Run after paint/layout
    const timer = setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  useEffect(() => {
    if (scrollDistance > 0 && textRef.current) {
      const duration = Math.max(3, scrollDistance / 25);
      
      const animate = () => {
        if (!textRef.current) return;
        textRef.current.style.transition = 'none';
        textRef.current.style.transform = 'translateX(0px)';
        
        // Force reflow
        void textRef.current.offsetWidth;
        
        textRef.current.style.transition = `transform ${duration}s linear`;
        textRef.current.style.transform = `translateX(-${scrollDistance + 20}px)`; // extra padding
      };
      
      const timer = setTimeout(animate, 1000); // initial delay
      
      const handleTransitionEnd = () => {
        animate();
      };
      
      textRef.current.addEventListener('transitionend', handleTransitionEnd);
      return () => {
        clearTimeout(timer);
        if (textRef.current) textRef.current.removeEventListener('transitionend', handleTransitionEnd);
      };
    } else if (textRef.current) {
      textRef.current.style.transition = 'none';
      textRef.current.style.transform = 'translateX(0px)';
    }
  }, [scrollDistance]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap w-full min-w-0 relative ${className || ''}`}
    >
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap pr-8"
      >
        {text}
      </span>
    </div>
  );
};

export default MarqueeText;
