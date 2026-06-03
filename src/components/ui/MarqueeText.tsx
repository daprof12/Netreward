import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({ text, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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

  const duration = Math.max(3, scrollDistance / 25); // 25px per second scrolling speed, min 3 seconds

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap w-full min-w-0 relative ${className || ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap"
        style={{
          transform: isHovered && scrollDistance > 0 ? `translateX(-${scrollDistance}px)` : 'translateX(0px)',
          transition: isHovered && scrollDistance > 0 ? `transform ${duration}s linear` : 'transform 0.4s ease-out',
        }}
      >
        {text}
      </span>
    </div>
  );
};

export default MarqueeText;
