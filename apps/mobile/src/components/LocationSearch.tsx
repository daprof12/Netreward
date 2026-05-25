import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView, Platform } from 'react-native';
import { Search, MapPin, Globe, X } from 'lucide-react-native';
import { useThemeColors } from '@/theme';

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

export default function LocationSearch({ value, onChange, placeholder = 'Search city, state, or country...', hasError = false }: LocationSearchProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  
  const [input, setInput] = useState(value === 'All' || value === 'Global' || value === 'All Countries' ? '' : value);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === 'All' || value === 'Global' || value === 'All Countries') {
      setInput('');
    } else {
      setInput(value);
    }
  }, [value]);

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
    <View style={[styles.container, { zIndex: showDropdown ? 1000 : 1 }]}>
      <View style={[styles.inputContainer, hasError && styles.inputError]}>
        {input ? (
          <MapPin size={20} color={colors.textSecondary} style={styles.leftIcon} />
        ) : (
          <Globe size={20} color={colors.textSecondary} style={styles.leftIcon} />
        )}
        
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
        />
        
        {isSearching ? (
          <ActivityIndicator size="small" color={colors.textSecondary} style={styles.rightIcon} />
        ) : input ? (
          <Pressable onPress={handleClear} style={styles.rightIcon}>
            <X size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {showDropdown && results.length > 0 && (
        <View style={styles.dropdownContainer}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
            {results.map((res, i) => (
              <Pressable
                key={i}
                style={[styles.resultItem, i === results.length - 1 && styles.lastResultItem]}
                onPress={() => handleSelect(res.display_name)}
              >
                <MapPin size={16} color={colors.textSecondary} style={styles.resultIcon} />
                <Text style={styles.resultText} numberOfLines={2}>{res.display_name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    height: 56,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: colors.error,
  },
  leftIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    height: '100%',
  },
  rightIcon: {
    padding: 8,
    marginLeft: 8,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    maxHeight: 240,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownScroll: {
    flexGrow: 0,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  lastResultItem: {
    borderBottomWidth: 0,
  },
  resultIcon: {
    marginRight: 12,
  },
  resultText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
});
