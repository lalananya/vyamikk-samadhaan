/**
 * Admin Taxonomy Management Screen
 * V1: Simple UI for reviewing and approving pending aliases
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { knowledgeGraphService } from '../src/services/KnowledgeGraphService';
import { PendingAlias } from '../src/types/KnowledgeGraph';

export default function AdminTaxonomyScreen() {
  const [pendingAliases, setPendingAliases] = useState<PendingAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPendingAliases();
  }, []);

  const loadPendingAliases = async () => {
    try {
      setLoading(true);
      const aliases = await knowledgeGraphService.getPendingAliases();
      setPendingAliases(aliases);
    } catch (error) {
      console.error('Failed to load pending aliases:', error);
      Alert.alert('Error', 'Failed to load pending aliases');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPendingAliases();
    setRefreshing(false);
  };

  const handleApprove = async (aliasId: string) => {
    Alert.alert(
      'Approve Alias',
      'This alias will be added to the knowledge graph. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              // For V1, we'll create a new entity or link to existing
              // In production, this would show a picker for existing entities
              await knowledgeGraphService.approvePendingAlias(
                aliasId,
                'urn:msme:entity:auto-generated', // Placeholder
                'admin-user'
              );
              await loadPendingAliases();
              Alert.alert('Success', 'Alias approved successfully');
            } catch (error) {
              console.error('Failed to approve alias:', error);
              Alert.alert('Error', 'Failed to approve alias');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (aliasId: string) => {
    Alert.prompt(
      'Reject Alias',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: async (reason) => {
            try {
              await knowledgeGraphService.rejectPendingAlias(
                aliasId,
                'admin-user',
                reason || 'No reason provided'
              );
              await loadPendingAliases();
              Alert.alert('Success', 'Alias rejected');
            } catch (error) {
              console.error('Failed to reject alias:', error);
              Alert.alert('Error', 'Failed to reject alias');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderPendingAlias = (alias: PendingAlias) => (
    <View key={alias.id} style={styles.aliasCard}>
      <View style={styles.aliasHeader}>
        <Text style={styles.aliasText}>{alias.text}</Text>
        <View style={styles.aliasMeta}>
          <Text style={styles.aliasType}>{alias.type}</Text>
          <Text style={styles.aliasLanguage}>{alias.language.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.aliasDetails}>
        <Text style={styles.aliasContext}>
          Context: {alias.context || 'Not specified'}
        </Text>
        <Text style={styles.aliasSubmitted}>
          Submitted by: {alias.submittedBy} • {formatDate(alias.submittedAt)}
        </Text>
      </View>

      <View style={styles.aliasActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(alias.id)}
        >
          <Ionicons name="close" size={16} color="#FF3B30" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApprove(alias.id)}
        >
          <Ionicons name="checkmark" size={16} color="#34C759" />
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading pending aliases...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Taxonomy Management</Text>
        <Text style={styles.subtitle}>
          Review and approve pending aliases
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
      >
        {pendingAliases.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#34C759" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>
              No pending aliases to review at the moment.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                {pendingAliases.length} pending alias{pendingAliases.length !== 1 ? 'es' : ''}
              </Text>
            </View>

            {pendingAliases.map(renderPendingAlias)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#ffffff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  statsText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  aliasCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  aliasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  aliasText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  aliasMeta: {
    alignItems: 'flex-end',
  },
  aliasType: {
    fontSize: 12,
    color: '#007AFF',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  aliasLanguage: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  aliasDetails: {
    marginBottom: 16,
  },
  aliasContext: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 4,
  },
  aliasSubmitted: {
    fontSize: 12,
    color: '#666666',
  },
  aliasActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  rejectButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  approveButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  approveButtonText: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '500',
  },
});

