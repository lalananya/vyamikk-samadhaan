import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { HttpClient } from '../src/api/http';
import { getToken } from '../src/storage/tokens';

const httpClient = new HttpClient(process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4001/api/v1');

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
  read_at: string | null;
}

interface Connection {
  ueid: string;
  displayName: string;
  role: string;
  category: string;
  isVerified: boolean;
  connectedAt: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (selectedPeer) {
      loadChatHistory();
    }
  }, [selectedPeer]);

  const loadConnections = async () => {
    try {
      const token = await getToken();
      const response = await httpClient.get('/directory/connections', {
        Authorization: `Bearer ${token}`
      });
      
      if (response.data.ok) {
        setConnections(response.data.suggestions);
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  };

  const loadChatHistory = async () => {
    if (!selectedPeer) return;
    
    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await httpClient.get(`/chat/history?peer=${selectedPeer}`, {
        Authorization: `Bearer ${token}`
      });
      
      if (response.data.ok) {
        setMessages(response.data.messages);
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedPeer) return;
    
    try {
      const token = await getToken();
      const response = await httpClient.post('/chat/dm', {
        to: selectedPeer,
        text: messageText.trim()
      }, {
        Authorization: `Bearer ${token}`
      });
      
      if (response.data.ok) {
        // Add message to local state
        const newMessage: Message = {
          id: response.data.messageId,
          sender_id: 'current_user', // This would be the actual user ID
          receiver_id: selectedPeer,
          text: messageText.trim(),
          created_at: response.data.createdAt,
          read_at: null
        };
        
        setMessages(prev => [...prev, newMessage]);
        setMessageText('');
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handlePeerSelect = (ueid: string) => {
    setSelectedPeer(ueid);
    setMessages([]);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === 'current_user'; // This would be actual user ID comparison
    
    return (
      <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
        <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, isOwn ? styles.ownMessageTime : styles.otherMessageTime]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  const renderConnection = ({ item }: { item: Connection }) => (
    <TouchableOpacity
      style={[
        styles.connectionItem,
        selectedPeer === item.ueid && styles.selectedConnection
      ]}
      onPress={() => handlePeerSelect(item.ueid)}
    >
      <View style={styles.connectionAvatar}>
        <Text style={styles.connectionAvatarText}>
          {item.displayName.charAt(0)}
        </Text>
      </View>
      <View style={styles.connectionInfo}>
        <Text style={styles.connectionName}>{item.displayName}</Text>
        <Text style={styles.connectionRole}>{item.role}</Text>
      </View>
      {item.isVerified && (
        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Direct Messages</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Connections Sidebar */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Connections</Text>
          <FlatList
            data={connections}
            renderItem={renderConnection}
            keyExtractor={(item) => item.ueid}
            style={styles.connectionsList}
          />
        </View>

        {/* Chat Area */}
        <View style={styles.chatArea}>
          {selectedPeer ? (
            <>
              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />

              {/* Message Input */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inputContainer}
              >
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.messageInput}
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Type a message..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={2000}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!messageText.trim()}
                  >
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles" size={64} color="#6B7280" />
              <Text style={styles.emptyStateTitle}>Select a connection</Text>
              <Text style={styles.emptyStateText}>
                Choose someone from your connections to start a conversation
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#1F2937',
    borderRightWidth: 1,
    borderRightColor: '#374151',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  connectionsList: {
    flex: 1,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  selectedConnection: {
    backgroundColor: '#4F46E5',
  },
  connectionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  connectionAvatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
  connectionRole: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    padding: 12,
    borderRadius: 16,
  },
  ownMessageText: {
    color: '#FFFFFF',
    backgroundColor: '#4F46E5',
  },
  otherMessageText: {
    color: '#FFFFFF',
    backgroundColor: '#374151',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  ownMessageTime: {
    color: '#9CA3AF',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#9CA3AF',
    textAlign: 'left',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#374151',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
});
