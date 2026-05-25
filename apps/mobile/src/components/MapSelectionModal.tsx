import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Modal, Dimensions, SafeAreaView, ScrollView, Platform } from 'react-native';
import { Search, MapPin, X, CheckCircle2, Map as MapIcon, Crosshair } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import Slider from '@react-native-community/slider';
import { useThemeColors } from '@/theme';
import { type TargetLocation } from '@/stores/useSpStore';

const { width, height } = Dimensions.get('window');

interface MapSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (locations: TargetLocation[]) => void;
  initialLocations: TargetLocation[];
}

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { padding: 0; margin: 0; background-color: #0a0c10; }
        html, body, #map { height: 100%; width: 100vw; }
        .leaflet-layer,
        .leaflet-control-zoom-in,
        .leaflet-control-zoom-out,
        .leaflet-control-attribution {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .custom-div-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0c10;
          border: 2px solid #3B82F6;
          color: #3B82F6;
          box-shadow: 0 0 15px rgba(59,130,246,0.5);
        }
        .custom-div-icon svg { width: 14px; height: 14px; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        var markers = {};
        var circles = {};

        var customIcon = L.divIcon({
            html: '<div class="custom-div-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>',
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
        });

        function clearMap() {
            for (var id in markers) { map.removeLayer(markers[id]); }
            for (var id in circles) { map.removeLayer(circles[id]); }
            markers = {};
            circles = {};
        }

        function renderLocations(locations, hoverId) {
            clearMap();
            locations.forEach(function(loc) {
                var isHovered = hoverId === loc.id;
                markers[loc.id] = L.marker([loc.lat, loc.lon], { icon: customIcon }).addTo(map);
                circles[loc.id] = L.circle([loc.lat, loc.lon], {
                    color: '#3B82F6',
                    fillColor: '#3B82F6',
                    fillOpacity: isHovered ? 0.3 : 0.1,
                    weight: isHovered ? 2 : 1,
                    radius: loc.radiusKm * 1000
                }).addTo(map);
            });
            
            if (locations.length > 0 && !hoverId) {
                var group = new L.featureGroup(Object.values(markers));
                map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 12 });
            }
        }

        document.addEventListener("message", function(event) {
            try {
                var data = JSON.parse(event.data);
                if (data.type === 'UPDATE_LOCATIONS') {
                    renderLocations(data.locations, data.hoverId);
                } else if (data.type === 'FLY_TO') {
                    map.flyTo([data.lat, data.lon], 10, { duration: 1.5 });
                }
            } catch(e) {}
        });
        window.addEventListener("message", function(event) {
             try {
                var data = JSON.parse(event.data);
                if (data.type === 'UPDATE_LOCATIONS') {
                    renderLocations(data.locations, data.hoverId);
                } else if (data.type === 'FLY_TO') {
                    map.flyTo([data.lat, data.lon], 10, { duration: 1.5 });
                }
            } catch(e) {}
        });
    </script>
</body>
</html>
`;

export default function MapSelectionModal({ isVisible, onClose, onSave, initialLocations }: MapSelectionModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  
  const [locations, setLocations] = useState<TargetLocation[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeRadius, setActiveRadius] = useState<number>(20);
  const [hoveredLoc, setHoveredLoc] = useState<string | null>(null);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (isVisible) {
      const locationsWithId = initialLocations.map(loc => ({
        ...loc,
        id: loc.id || Math.random().toString(36).substring(7)
      }));
      setLocations(locationsWithId);
      setSearchInput('');
      setSearchResults([]);
      setActiveRadius(20);
      updateWebViewMap(locationsWithId, null);
    }
  }, [isVisible, initialLocations]);

  const updateWebViewMap = (locs: TargetLocation[], hoverId: string | null) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'UPDATE_LOCATIONS',
        locations: locs,
        hoverId
      }));
    }
  };

  useEffect(() => {
    updateWebViewMap(locations, hoveredLoc);
  }, [locations, hoveredLoc]);

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
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput]);

  const handleAddLocation = (res: any) => {
    if (!locations.find(l => l.name === res.name)) {
      const newLocs = [...locations, {
        id: Math.random().toString(36).substring(7),
        name: res.name,
        radiusKm: activeRadius,
        lat: res.lat,
        lon: res.lon
      }];
      setLocations(newLocs);
      
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'FLY_TO',
          lat: res.lat,
          lon: res.lon
        }));
      }
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

  const handleRadiusChange = (val: number) => {
    setActiveRadius(val);
    setLocations(prev => prev.map(loc => ({ ...loc, radiusKm: val })));
  };

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <MapIcon size={20} color={colors.accentPrimary} />
            <Text style={styles.headerTitle}>Audience Map</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Controls Panel */}
          <View style={styles.controlsPanel}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country, state, city..."
                placeholderTextColor={colors.textTertiary}
                value={searchInput}
                onChangeText={setSearchInput}
              />
              {isSearching && <ActivityIndicator size="small" color={colors.textSecondary} style={styles.searchLoader} />}
            </View>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && searchInput.length > 0 && (
              <View style={styles.searchResults}>
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                  {searchResults.map((res, i) => (
                    <Pressable
                      key={i}
                      style={styles.searchResultItem}
                      onPress={() => handleAddLocation(res)}
                    >
                      <MapPin size={14} color={colors.textSecondary} style={styles.searchResultIcon} />
                      <Text style={styles.searchResultText} numberOfLines={2}>{res.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Radius Slider */}
            <View style={styles.radiusContainer}>
              <View style={styles.radiusHeader}>
                <Text style={styles.radiusLabel}>CAPTURE RADIUS</Text>
                <View style={styles.radiusBadge}>
                  <Text style={styles.radiusBadgeText}>{Math.round(activeRadius)} km</Text>
                </View>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={1000}
                value={activeRadius}
                onValueChange={handleRadiusChange}
                minimumTrackTintColor={colors.accentPrimary}
                maximumTrackTintColor={colors.bgSecondary}
                thumbTintColor={colors.accentPrimary}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>1km</Text>
                <Text style={styles.sliderLabelText}>1,000km</Text>
              </View>
            </View>

            {/* Selected Locations */}
            <View style={styles.selectedLocationsContainer}>
              <Text style={styles.selectedLocationsLabel}>SELECTED LOCATIONS ({locations.length})</Text>
              {locations.length === 0 ? (
                <View style={styles.emptyLocations}>
                  <MapPin size={24} color={colors.textTertiary} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyLocationsText}>No areas selected yet.</Text>
                  <Text style={styles.emptyLocationsText}>Search above to drop a pin.</Text>
                </View>
              ) : (
                <ScrollView style={styles.locationsList}>
                  {locations.map(loc => (
                    <Pressable
                      key={loc.id}
                      style={styles.locationItem}
                      onPress={() => {
                        setHoveredLoc(loc.id ?? null);
                        if (webViewRef.current) {
                           webViewRef.current.postMessage(JSON.stringify({ type: 'FLY_TO', lat: loc.lat, lon: loc.lon }));
                        }
                      }}
                    >
                      <View style={styles.locationItemLeft}>
                        <View style={styles.locationItemIcon}>
                          <MapPin size={14} color={colors.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.locationItemName} numberOfLines={1}>{loc.name.split(',')[0]}</Text>
                          <Text style={styles.locationItemSub} numberOfLines={1}>{loc.name}</Text>
                          <Text style={styles.locationItemRadius}>Radius: {Math.round(loc.radiusKm)}km</Text>
                        </View>
                      </View>
                      <Pressable onPress={() => removeLocation(loc.id ?? '')} style={styles.removeBtn}>
                        <X size={16} color={colors.textSecondary} />
                      </Pressable>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          {/* Map Area */}
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: LEAFLET_HTML }}
              style={styles.webview}
              scrollEnabled={false}
              bounces={false}
              onLoadEnd={() => updateWebViewMap(locations, hoveredLoc)}
            />
            {locations.length === 0 && (
              <View style={styles.mapOverlay}>
                <Crosshair size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                <Text style={styles.mapOverlayText}>AWAITING COORDINATES</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <CheckCircle2 size={18} color="#0f172a" style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>Confirm Audience Area</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    backgroundColor: colors.bgPrimary,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  controlsPanel: {
    padding: 16,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    maxHeight: '50%',
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    height: '100%',
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchResults: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  searchResultIcon: {
    marginRight: 12,
  },
  searchResultText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  radiusContainer: {
    backgroundColor: colors.bgPrimary,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 16,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  radiusLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  radiusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  radiusBadgeText: {
    color: colors.accentPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabelText: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  selectedLocationsContainer: {
    flex: 1,
    minHeight: 100,
  },
  selectedLocationsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyLocations: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderStyle: 'dashed',
  },
  emptyLocationsText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  locationsList: {
    flex: 1,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 8,
  },
  locationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  locationItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationItemName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  locationItemSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  locationItemRadius: {
    color: colors.accentPrimary,
    fontSize: 10,
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0a0c10',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 12, 16, 0.7)',
    pointerEvents: 'none',
  },
  mapOverlayText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accentPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
