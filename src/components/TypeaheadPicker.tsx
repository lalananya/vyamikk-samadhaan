/**
 * Typeahead Picker Component for Knowledge Graph Entities
 * V1: Simple, deterministic matching with offline support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { knowledgeGraphService } from '../services/KnowledgeGraphService';
import { TypeaheadResult, EntityType } from '../types/KnowledgeGraph';

interface TypeaheadPickerProps {
  placeholder: string;
  entityType: EntityType;
  language?: 'en' | 'hi';
  onSelect: (result: TypeaheadResult) => void;
  onNotFound?: (query: string) => void;
  value?: string;
  disabled?: boolean;
  style?: any;
}

export default function TypeaheadPicker({
  placeholder,
  entityType,
  language = 'en',
  onSelect,
  onNotFound,
  value = '',
  disabled = false,
  style,
}: TypeaheadPickerProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<TypeaheadResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TypeaheadResult | null>(null);
  
  const inputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (query.length >= 2) {
      performSearch();
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const performSearch = async () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await knowledgeGraphService.search(query, {
          type: entityType,
          language,
          limit: 10,
          minScore: 0.3,
        });
        setResults(searchResults);
        setShowResults(true);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce search
  };

  const handleSelect = (result: TypeaheadResult) => {
    setSelectedResult(result);
    setQuery(result.text);
    setShowResults(false);
    onSelect(result);
  };

  const handleTextChange = (text: string) => {
    setQuery(text);
    setSelectedResult(null);
  };

  const handleFocus = () => {
    if (query.length >= 2 && results.length > 0) {
      setShowResults(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding results to allow for selection
    setTimeout(() => setShowResults(false), 150);
  };

  const handleNotFound = () => {
    if (onNotFound) {
      onNotFound(query);
    } else {
      Alert.alert(
        'Not Found',
        `"${query}" not found. Would you like to suggest it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Suggest',
            onPress: () => suggestNewAlias(query),
          },
        ]
      );
    }
  };

  const suggestNewAlias = async (text: string) => {
    try {
      await knowledgeGraphService.submitPendingAlias(
        text,
        language,
        'synonym',
        `Profile Wizard - ${entityType}`,
        undefined
      );
      Alert.alert(
        'Thank you!',
        'Your suggestion has been submitted for review. It will be available soon.'
      );
    } catch (error) {
      console.error('Failed to submit alias:', error);
      Alert.alert('Error', 'Failed to submit suggestion. Please try again.');
    }
  };

  const renderResult = ({ item }: { item: TypeaheadResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultText}>{item.text}</Text>
        <Text style={styles.resultCanonical}>{item.canonicalName}</Text>
        {item.isExact && (
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
        )}
      </View>
      <View style={styles.resultMeta}>
        <Text style={styles.resultType}>{item.entityType}</Text>
        <Text style={styles.resultScore}>
          {Math.round(item.score * 100)}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search" size={24} color="#666666" />
      <Text style={styles.emptyText}>No results found</Text>
      <TouchableOpacity
        style={styles.suggestButton}
        onPress={handleNotFound}
      >
        <Text style={styles.suggestButtonText}>Can't find it? Suggest it</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, disabled && styles.inputDisabled]}
          placeholder={placeholder}
          value={query}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isLoading && (
          <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
        )}
        {selectedResult && (
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
        )}
      </View>

      {showResults && (
        <View style={styles.resultsContainer}>
          {results.length > 0 ? (
            <FlatList
              data={results}
              renderItem={renderResult}
              keyExtractor={(item) => item.id}
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            renderEmptyState()
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    padding: 0,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  loader: {
    marginLeft: 8,
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1001,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    flex: 1,
  },
  resultCanonical: {
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 8,
    flex: 1,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultType: {
    fontSize: 12,
    color: '#007AFF',
    textTransform: 'capitalize',
  },
  resultScore: {
    fontSize: 12,
    color: '#666666',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 8,
    marginBottom: 12,
  },
  suggestButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  suggestButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

