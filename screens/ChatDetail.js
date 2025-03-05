import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Keyboard,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { Text, TextInput, Surface } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ChatDetailHeader from './ChatDetailHeader';
import AntDesign from '@expo/vector-icons/AntDesign';
import getCurrentUserId from '../utils/getCurrentUserId';
import { SocketContext } from './SocketProvider';

export default function ChatDetail({ route, navigation }) {
  const { chatId, contactName, contactImage } = route.params;
  const [messages, setMessages] = useState([]);
  const [groupedMessages, setGroupedMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef();
  const inputRef = useRef();
  const socketRef = useRef();
  const sendButtonOpacity = useRef(new Animated.Value(0)).current;

  // Access and update the activeChatId from SocketContext
  const { setActiveChatId } = useContext(SocketContext);

  // Set activeChatId on mount, clear on unmount
  useEffect(() => {
    setActiveChatId(chatId);
    return () => {
      setActiveChatId(null);
    };
  }, [chatId, setActiveChatId]);

  const markAllMessagesAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) return;
      await axios.post(
        `http://192.168.1.60:8000/securetalk/api/social/chats/${chatId}/messages/mark_as_read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  useEffect(() => {
    const socketUrl = `ws://192.168.1.60:8000/ws/socket-server/${chatId}/`;

    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: 'mark_all_as_read',
          chat_id: chatId,
        })
      );
    };

    socket.onmessage = async (e) => {
      const response = JSON.parse(e.data);
      console.log('Received WebSocket message:', response);

      if (response.type === 'new_message' && response.chat_id === chatId) {
        const currentUserId = await getCurrentUserId();
        if (response.message.sender.id !== currentUserId) {
          const modifiedMessage = {
            ...response.message,
            isFromCurrentUser: false,
          };

          setMessages((prev) => [...prev, modifiedMessage]);
          updateChatList(modifiedMessage);
          markAllMessagesAsRead();
          socketRef.current.send(
            JSON.stringify({
              type: 'mark_as_read',
              chat_id: chatId,
              message_id: modifiedMessage.id,
            })
          );
        }
      } else if (response.type === 'mark_as_read' && response.chat_id === chatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === response.message_id ? { ...msg, is_read: true, status: 'read' } : msg
          )
        );
      } else if (response.type === 'mark_all_as_read' && response.chat_id === chatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isFromCurrentUser ? { ...msg, is_read: true, status: 'read' } : msg
          )
        );
      }
    };

    return () => {
      socket.close();
    };
  }, [chatId]);

  const updateChatList = useCallback(async (newMessage) => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) return;
      const chatsJson = await AsyncStorage.getItem('local_chats');
      if (chatsJson) {
        const chats = JSON.parse(chatsJson);
        const updatedChats = chats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              last_message: newMessage.content,
              updatedAt: new Date().toISOString(),
              unreadCount: 0,
            };
          }
          return chat;
        });
        updatedChats.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        await AsyncStorage.setItem('local_chats', JSON.stringify(updatedChats));
      }
    } catch (error) {
      console.error('Error updating chat list:', error);
    }
  }, [chatId]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('user_token');
        if (!token) {
          navigation.replace('SignIn');
          return;
        }
        const response = await axios.get(
          `http://192.168.1.60:8000/securetalk/api/social/chats/${chatId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data && response.data.messages) {
          await AsyncStorage.setItem(
            `local_messages_${chatId}`,
            JSON.stringify(response.data.messages)
          );
          setMessages(response.data.messages);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
        const localMessagesJson = await AsyncStorage.getItem(`local_messages_${chatId}`);
        if (localMessagesJson) {
          setMessages(JSON.parse(localMessagesJson));
        }
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
    markAllMessagesAsRead();
  }, [chatId, navigation]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: false });
      }, 500);
    }
  }, [messages]);

  // Helper function to determine date labels
  const getDateLabel = (date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = today - messageDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  // Group messages by date
  const groupMessagesByDate = (msgs) => {
    if (!msgs || msgs.length === 0) return [];
    const sorted = [...msgs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const grouped = [];
    let lastDateLabel = null;

    for (const msg of sorted) {
      const dateLabel = getDateLabel(new Date(msg.createdAt));
      if (dateLabel !== lastDateLabel) {
        grouped.push({
          type: 'date',
          label: dateLabel,
          id: `date-separator-${msg.id}`,
        });
        lastDateLabel = dateLabel;
      }
      grouped.push({ type: 'message', ...msg });
    }
    return grouped;
  };

  useEffect(() => {
    Animated.timing(sendButtonOpacity, {
      toValue: messageText.trim() && !sending ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [messageText, sending]);

  // Whenever messages change, recompute grouped messages
  useEffect(() => {
    setGroupedMessages(groupMessagesByDate(messages));
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    let localMessage;
    try {
      setSending(true);
      const token = await AsyncStorage.getItem('user_token');
      if (!token) {
        navigation.replace('SignIn');
        return;
      }

      const messageToSend = messageText.trim();
      localMessage = {
        id: new Date().getTime(),
        content: messageToSend,
        createdAt: new Date().toISOString(),
        isFromCurrentUser: true,
        status: 'loading',
      };

      setMessages((prev) => [...prev, localMessage]);
      setMessageText('');
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: false });
      }

      const response = await axios.post(
        `http://192.168.1.60:8000/securetalk/api/social/chats/${chatId}/new_message`,
        { content: messageToSend },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && response.data.message) {
        const newMessage = response.data.message;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === localMessage.id ? { ...newMessage, status: 'sent' } : msg))
        );
        socketRef.current.send(
          JSON.stringify({
            type: 'new_message',
            chat_id: chatId,
            message: newMessage,
          })
        );
        updateChatList(newMessage);
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
        await AsyncStorage.setItem(
          `local_messages_${chatId}`,
          JSON.stringify([...messages, newMessage])
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setMessages((prev) =>
        prev.map((msg) => (msg.id === localMessage?.id ? { ...msg, status: 'error' } : msg))
      );
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderChatItem = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparatorContainer}>
          <Text style={styles.dateSeparatorText}>{item.label}</Text>
        </View>
      );
    }

    const isCurrentUser = item.isFromCurrentUser;
    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}
          >
            {formatTime(item.createdAt)}
            <Text>  </Text>
            {isCurrentUser && (
              <>
                <MaterialCommunityIcons
                  name={
                    item.status === 'loading'
                      ? 'clock-outline'
                      : item.is_read
                      ? 'check-all'
                      : ''
                  }
                  size={18}
                  color={
                    item.status === 'loading'
                      ? '#1F2937'
                      : item.is_read
                      ? '#10B981'
                      : '#1F2937'
                  }
                  style={styles.statusIcon}
                />
                <AntDesign
                  name={item.status === 'sent' ? 'check' : ''}
                  size={18}
                  color="#1F2937"
                  style={styles.statusIcon}
                />
              </>
            )}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ChatDetailHeader
        contactName={contactName}
        contactImage={contactImage}
        onBackPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ImageBackground
          source={require('../assets/wallpaper.png')}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.wallpaperImage}
        />
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={groupedMessages}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={renderChatItem}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() =>
                flatListRef.current.scrollToEnd({ animated: false })
              }
            />
          )}
        </View>
        <Surface style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              style={styles.input}
              multiline
              maxLength={500}
              disabled={sending}
              blurOnSubmit={false}
              returnKeyType="default"
              onFocus={() => {
                setTimeout(() => {
                  if (flatListRef.current && messages.length > 0) {
                    flatListRef.current.scrollToEnd({ animated: false });
                  }
                }, 50);
              }}
              theme={{ roundness: 24 }}
            />
          </View>
          {!messageText.trim() || sending ? null : (
            <Animated.View style={{ opacity: sendButtonOpacity }}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !messageText.trim() || sending ? styles.disabledSendButton : {},
                ]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sending}
              >
                <MaterialCommunityIcons name="send" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const colors = {
  primary: '#4F46E5',
  secondary: '#818CF8',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#1F2937',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  wallpaperImage: {
    resizeMode: 'cover',
  },
  messagesList: {
    padding: 4,
  },
  dateSeparatorContainer: {
    alignSelf: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 6,
    width: '30%',
    textAlign: 'center',
  },
  dateSeparatorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333333',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
  },
  currentUserBubble: {
    backgroundColor: '#d6fdd0',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 18,
  },
  currentUserText: {
    color: '#1F2937',
  },
  otherUserText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
    opacity: 0.7,
  },
  statusIcon: {
    marginLeft: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    paddingBottom: 20,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    marginHorizontal: 4,
    overflow: 'hidden',
    height: 45,
    width: 40,
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 24,
    height: 40,
  },
  sendButton: {
    backgroundColor: '#1eaa61',
    borderRadius: 24,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    width: 40,
  },
  disabledSendButton: {
    backgroundColor: '#3e8d64',
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    marginTop: 12,
    fontSize: 16,
  },
});