import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MapPin, Map, Trash2, CheckCircle2, Crosshair, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { type TargetLocation } from '@/stores/useSpStore';

interface MapSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (locations: TargetLocation[]) => void;
  initialLocations: TargetLocation[];
  readOnly?: boolean;
}

interface SearchResult {
  name: string;
  lat: number;
  lon: number;
}

// Custom SVG Pin for Leaflet
const customIconHtml = `
  <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#0a0c10;border:2px solid #3B82F6;color:#3B82F6;box-shadow:0 0 15px rgba(59,130,246,0.5);">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
  </div>
`;

const mapIcon = L.divIcon({
  html: customIconHtml,
  className: '', // Prevents default leaflet styling on div
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Component to handle flying to coordinates
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 10, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export default function MapSelectionModal({ isOpen, onClose, onSave, initialLocations, readOnly = false }: MapSelectionModalProps) {
  const [locations, setLocations] = useState<TargetLocation[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeRadius, setActiveRadius] = useState<number>(20); // Default 20km
  
  // For animation/interaction state
  const [hoveredLoc, setHoveredLoc] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial locations
  useEffect(() => {
    if (isOpen) {
      const locationsWithId = initialLocations.map(loc => ({
        ...loc,
        id: loc.id || crypto.randomUUID()
      }));
      setLocations(locationsWithId);
      setSearchInput('');
      setSearchResults([]);
      setActiveRadius(20);
      setMapCenter(locationsWithId.length > 0 ? [locationsWithId[0].lat, locationsWithId[0].lon] : [20, 0]);
    }
  }, [isOpen, initialLocations]);

  // Geocoding Search
  useEffect(() => {
    if (searchInput.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}`);
        const data = await res.json();
        setSearchResults(data.slice(0, 5).map((d: any) => ({
          name: d.display_name,
          lat: parseFloat(d.lat),
          lon: parseFloat(d.lon)
        })));
      } catch (error) {
        console.error("Geocoding error", error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce
    
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput]);

  const handleAddLocation = (res: SearchResult) => {
    if (!locations.find(l => l.name === res.name)) {
      setLocations([...locations, {
        id: crypto.randomUUID(),
        name: res.name,
        radiusKm: activeRadius,
        lat: res.lat,
        lon: res.lon
      }]);
      setMapCenter([res.lat, res.lon]);
    }
    setSearchInput('');
    setSearchResults([]);
  };

  const removeLocation = (id: string) => {
    setLocations(locations.filter(l => l.id !== id));
  };

  const handleSave = () => {
    onSave(locations);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <style>{`
        .leaflet-container { width: 100%; height: 100%; z-index: 10; background: #0a0c10; }
        /* CSS Invert filter for Dark Mode Maps */
        .leaflet-layer,
        .leaflet-control-zoom-in,
        .leaflet-control-zoom-out,
        .leaflet-control-attribution {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
      `}</style>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-6xl bg-bg-primary rounded-2xl border border-glass-border shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[75vh] relative"
      >
        {readOnly && (
          <button onClick={onClose} className="absolute top-4 right-4 z-[500] p-2 bg-bg-primary/80 backdrop-blur-sm border border-glass-border rounded-full shadow-lg text-text-primary hover:bg-bg-secondary transition-colors">
            <X size={20} />
          </button>
        )}

        {/* Left Panel: Controls & List */}
        {!readOnly && (
        <div className="w-full md:w-1/3 bg-bg-secondary border-r border-glass-border flex flex-col h-1/2 md:h-full z-20">
          <div className="p-4 border-b border-glass-border flex justify-between items-center bg-bg-primary">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Map size={18} className="text-accent-primary" /> Audience Map
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-bg-secondary rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input 
                type="text" 
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search country, state, city..."
                className="w-full bg-bg-primary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary transition-colors"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 size={14} className="animate-spin text-text-secondary" />
                </div>
              )}
              
              {/* Search Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && searchInput.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute z-[100] w-full mt-2 bg-bg-primary border border-glass-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
                  >
                    {searchResults.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => handleAddLocation(res)}
                        className="w-full text-left px-4 py-3 hover:bg-bg-secondary transition-colors text-sm flex items-start gap-2 border-b border-glass-border last:border-0"
                      >
                        <MapPin size={14} className="text-text-secondary shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-tight">{res.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Radius Slider */}
            <div className="bg-bg-primary p-3 rounded-xl border border-glass-border">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-text-secondary uppercase">Capture Radius</label>
                <span className="text-xs font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-full">
                  {activeRadius} km
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="1000" 
                value={activeRadius}
                onChange={e => {
                  const r = Number(e.target.value);
                  setActiveRadius(r);
                  // Live-update the radius on all pinned locations
                  setLocations(prev => prev.map(loc => ({ ...loc, radiusKm: r })));
                }}
                className="w-full accent-accent-primary h-1.5 bg-bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                <span>1km</span>
                <span>1,000km</span>
              </div>
            </div>

            {/* Selected Locations List */}
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase mb-2">Selected Locations ({locations.length})</h3>
              {locations.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-glass-border rounded-xl bg-bg-primary">
                  <MapPin size={24} className="mx-auto text-text-secondary opacity-50 mb-2" />
                  <p className="text-xs text-text-secondary">No areas selected yet.<br/>Search above to drop a pin.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {locations.map(loc => (
                      <motion.div
                        key={loc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onMouseEnter={() => {
                          setHoveredLoc(loc.id);
                          setMapCenter([loc.lat, loc.lon]);
                        }}
                        onMouseLeave={() => setHoveredLoc(null)}
                        className="flex items-center justify-between p-2.5 bg-bg-primary border border-glass-border rounded-xl group hover:border-accent-primary/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${hoveredLoc === loc.id ? 'bg-accent-primary/20 text-accent-primary' : 'bg-bg-secondary text-text-secondary'}`}>
                            <MapPin size={12} />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold truncate text-text-primary">{loc.name.split(',')[0]}</p>
                            <p className="text-[10px] text-text-secondary truncate">{loc.name}</p>
                            <p className="text-[10px] text-accent-primary mt-0.5">Radius: {loc.radiusKm}km</p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLocation(loc.id);
                          }}
                          className="p-1.5 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-glass-border bg-bg-primary">
            <button 
              onClick={handleSave}
              className="w-full py-3 bg-accent-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-accent-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> Confirm Audience Area
            </button>
          </div>
        </div>
        )}

        {/* Right Panel: React-Leaflet Map */}
        <div className={`w-full ${readOnly ? 'h-full' : 'md:w-2/3 h-1/2 md:h-full'} relative overflow-hidden bg-[#0a0c10] z-10`}>
          <MapContainer 
            center={[20, 0]} 
            zoom={3} 
            scrollWheelZoom={true} 
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapController center={mapCenter} />

            {locations.map((loc) => {
              const isHovered = hoveredLoc === loc.id;
              return (
                <div key={loc.id}>
                  <Marker position={[loc.lat, loc.lon]} icon={mapIcon} />
                  <Circle 
                    center={[loc.lat, loc.lon]} 
                    radius={loc.radiusKm * 1000} // Leaflet circle radius is in meters
                    pathOptions={{ 
                      color: '#3B82F6', 
                      fillColor: '#3B82F6', 
                      fillOpacity: isHovered ? 0.3 : 0.1,
                      weight: isHovered ? 2 : 1
                    }} 
                  />
                </div>
              );
            })}
          </MapContainer>

          {/* Empty State Overlay */}
          {locations.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center flex-col text-center opacity-30 pointer-events-none z-[400]">
              <Crosshair size={48} className="mb-4 text-text-secondary drop-shadow-xl" />
              <p className="text-sm font-bold tracking-widest uppercase text-text-secondary drop-shadow-md">Awaiting Coordinates</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
