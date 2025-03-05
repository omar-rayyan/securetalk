import React, { createContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import getCurrentUserId from '../utils/getCurrentUserId';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [chats, setChats] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [activeChatId, setActiveChatId] = useState(null);

  const socketRef = useRef(null);

  const BASE_SOCKET_URL = 'ws://192.168.1.60:8000/ws/socket-server/home/';

  // Request permission to show notifications
  useEffect(() => {
    const registerForPushNotificationsAsync = async () => {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
        }
      } else {
        console.log('Must use physical device for Push Notifications');
      }
    };
    registerForPushNotificationsAsync();
  }, []);

  // Local notification handler (if user is not on the chat screen)
  const sendLocalNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  };

  // Load current user ID (or retrieve it however your app handles user identity)
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const id = await getCurrentUserId();
        setCurrentUserId(id);
      } catch (error) {
        console.error('Failed to load current user ID:', error);
      }
    };
    loadUserId();
  }, []);

  // Connect to the "home" WebSocket when the provider mounts
  useEffect(() => {
    const socket = new WebSocket(BASE_SOCKET_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to home socket');
      setIsConnected(true);
    };

    socket.onmessage = async (e) => {
      try {
        const response = JSON.parse(e.data);
        if (response.type === 'new_message' && response.chat_id) {
          updateChatsList(response.chat_id, response.message);
            console.log(activeChatId, response.chat_id);
          if (activeChatId !== response.chat_id) {
            const notificationTitle = response.message.sender.fullName;
            const notificationBody = response.message.content;
            sendLocalNotification(notificationTitle, notificationBody);
          }
        }
      } catch (error) {
        console.error('Failed to parse socket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.log('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('Disconnected from home socket');
      setIsConnected(false);
    };

    return () => {
      socket.close();
    };
  }, [activeChatId, updateChatsList]);

  const updateChatsList = useCallback(async (chatId, lastMessage) => {
    if (!chatId || !lastMessage) return;
    try {
      const storedChatsJson = await AsyncStorage.getItem('local_chats');
      let parsedChats = storedChatsJson ? JSON.parse(storedChatsJson) : [];

      // Update an existing chat if found
      let foundChat = false;
      parsedChats = parsedChats.map((chat) => {
        if (chat.id === chatId) {
          foundChat = true;
          return {
            ...chat,
            lastMessageObj: lastMessage,
            last_message:
              typeof lastMessage === 'object'
                ? lastMessage.content || ''
                : String(lastMessage),
            updatedAt: new Date().toISOString(),
          };
        }
        return chat;
      });

      // If no chat matches this ID, create a new one (could be a newly created chat)
      if (!foundChat) {
        parsedChats.push({
          id: chatId,
          lastMessageObj: lastMessage,
          last_message:
            typeof lastMessage === 'object'
              ? lastMessage.content || ''
              : String(lastMessage),
          updatedAt: new Date().toISOString(),
          chatName: 'New Chat',
          contactImage: '',
          users: [currentUserId],
        });
      }

      // Re-sort by most recent update
      parsedChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      setChats(parsedChats);
      await AsyncStorage.setItem('local_chats', JSON.stringify(parsedChats));
    } catch (error) {
      console.error('Error updating local chats:', error);
    }
  }, [currentUserId]);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        socketRef,
        chats,
        setChats,
        updateChatsList,
        activeChatId,
        setActiveChatId,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}