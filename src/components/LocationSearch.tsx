import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

export default function LocationSearch({ value, onChange, placeholder = 'Search city, state, or country...', className = '', hasError = false }: LocationSearchProps) {
  const [input, setInput] = useState(value === 'All' || value === 'Global' || value === 'All Countries' ? '' : value);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If value changes externally
    if (value === 'All' || value === 'Global' || value === 'All Countries') {
      setInput('');
    } else {
      setInput(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (input.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (input === value) return; // Don't search if it's already the selected value

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}`);
        const data = await res.json();
        setResults(data.slice(0, 5));
        setShowDropdown(true);
      } catch (error) {
        console.error("Geocoding error", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [input, value]);

  const handleSelect = (displayName: string) => {
    setInput(displayName);
    onChange(displayName);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setInput('');
    onChange('');
    setShowDropdown(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative flex items-center">
        {input ? (
          <MapPin size={16} className="absolute left-3 text-text-secondary" />
        ) : (
          <Globe size={16} className="absolute left-3 text-text-secondary" />
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className={`w-full bg-bg-secondary border ${hasError ? 'border-red-500' : 'border-glass-border'} rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-accent-primary transition-colors`}
        />
        {isSearching ? (
          <Loader2 size={14} className="absolute right-3 animate-spin text-text-secondary" />
        ) : input ? (
          <button onClick={handleClear} className="absolute right-3 text-text-secondary hover:text-text-primary p-0.5">
            <Search size={14} className="opacity-0 hidden" />
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-glass-border hover:bg-glass-border/80">Clear</span>
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {showDropdown && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-[999] w-full mt-2 bg-bg-primary border border-glass-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
          >
            {results.map((res, i) => (
              <button
                key={i}
                onClick={() => handleSelect(res.display_name)}
                className="w-full text-left px-4 py-3 hover:bg-bg-secondary transition-colors text-sm flex items-start gap-2 border-b border-glass-border last:border-0"
              >
                <MapPin size={14} className="text-text-secondary shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-tight">{res.display_name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
