import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  StatusBar, 
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { 
  Text, 
  Searchbar, 
  IconButton,
  BottomNavigation,
  Avatar,
  Divider,
  Badge
} from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import getCurrentUserId from '../utils/getCurrentUserId';
import { SocketContext } from './SocketProvider';

export default function HomeScreen({ navigation, route }) {
  const [index, setIndex] = useState(1); // Start on Messages tab
  const [routes] = useState([
    { key: 'contacts', title: 'Contacts', icon: 'account-multiple' },
    { key: 'messages', title: 'Messages', icon: 'message-text' },
    { key: 'settings', title: 'Settings', icon: 'cog' }
  ]);

  // States for contacts tab
  const [contacts, setContacts] = useState([]);
  const [contactsSearchQuery, setContactsSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // States for messages tab
  const [messagesSearchQuery, setMessagesSearchQuery] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);

  // Use chats from the SocketProvider for real-time updates
  const { chats, setChats, updateChatsList } = useContext(SocketContext);

  // Custom theme colors
  const colors = {
    primary: '#4F46E5',
    secondary: '#818CF8',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#1F2937',
    border: '#E5E7EB',
    error: '#EF4444',
    unread: '#10B981',
  };

  // Load locally stored chats first for immediate display
  useEffect(() => {
    const loadLocalChats = async () => {
      try {
        const localChatsJson = await AsyncStorage.getItem('local_chats');
        if (localChatsJson) {
          const localChats = JSON.parse(localChatsJson);
          setChats(localChats);
          setLoadingChats(false);
        }
      } catch (error) {
        console.error('Error loading local chats:', error);
      }
    };
    loadLocalChats();
  }, [setChats]);

  // Fetch contacts from API
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        if (!token) {
          navigation.replace('SignIn');
          return;
        }

        const response = await axios.get(
          'http://192.168.1.60:8000/securetalk/api/social/contacts',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.users && Array.isArray(response.data.users)) {
          const contactsList = response.data.users;
          // Cache profile pictures
          await Promise.all(contactsList.map(async (contact) => {
            if (contact.profile_picture.startsWith("https")) {
              const imageKey = `profile_picture_${contact.id}`;
              await AsyncStorage.setItem(imageKey, contact.profile_picture);
            }
          }));
          setContacts(contactsList);
          setFilteredContacts(contactsList);
        }
      } catch (error) {
        console.error('Failed to fetch contacts', error);
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, [navigation]);

  // Function to fetch chats/messages from API
  const fetchChats = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) {
        navigation.replace('SignIn');
        return;
      }

      const response = await axios.get(
        'http://192.168.1.60:8000/securetalk/api/social/chats',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.chats && Array.isArray(response.data.chats)) {
        const sortedChats = response.data.chats.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        setChats(sortedChats);
        // Store chats in AsyncStorage
        await AsyncStorage.setItem('local_chats', JSON.stringify(sortedChats));
      }
    } catch (error) {
      console.error('Failed to fetch chats', error);
    } finally {
      setLoadingChats(false);
    }
  };

  // Fetch chats when HomeScreen mounts
  useEffect(() => {
    fetchChats();
  }, []);

  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) {
        navigation.replace('SignIn');
        return;
      }
  
      await axios.post(
        'http://192.168.1.60:8000/securetalk/api/users/logout',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      // Clear the token and local data
      await AsyncStorage.removeItem('user_token');
      await AsyncStorage.removeItem('local_chats');
  
      navigation.replace('SignIn');
    } catch (error) {
      console.error('Failed to log out:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  // Refresh chats when returning to this screen
  useFocusEffect(
    React.useCallback(() => {
      const shouldRefresh = route.params?.refreshChats;
      if (shouldRefresh) {
        fetchChats();
        navigation.setParams({ refreshChats: undefined });
      }
      return () => {};
    }, [navigation, route.params?.refreshChats])
  );

  // Filter contacts
  useEffect(() => {
    if (contactsSearchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => 
        contact.fullName.toLowerCase().includes(contactsSearchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  }, [contactsSearchQuery, contacts]);

  // Filter chats
  const filteredChats = React.useMemo(() => {
    if (messagesSearchQuery.trim() === '') {
      return chats;
    }
    return chats.filter(chat => {
      const nameMatch =
        chat.chatName &&
        chat.chatName.toLowerCase().includes(messagesSearchQuery.toLowerCase());
      const messageMatch =
        chat.last_message &&
        chat.last_message.toLowerCase().includes(messagesSearchQuery.toLowerCase());
      return nameMatch || messageMatch;
    });
  }, [messagesSearchQuery, chats]);

  // Create a new chat (switch to Contacts tab)
  const handleNewChat = () => {
    setIndex(0);
  };

  // Open a chat
  const handleOpenChat = (chatId, contactName, contactImage) => {
    navigation.navigate('ChatDetail', { chatId, contactName, contactImage });
  };

  // Open a contact and potentially create a new chat
  const handleOpenContact = async (contactId, contactName) => {
    try {
      setLoadingContacts(true);
      const token = await AsyncStorage.getItem('user_token');
      if (!token) {
        navigation.replace('SignIn');
        return;
      }

      // Check if a chat with this contact already exists
      const existingChat = chats.find(chat => {
        if (chat.users && chat.users.length === 2) {
          const userIds = chat.users.map(user => user.id);
          return userIds.includes(getCurrentUserId()) && userIds.includes(contactId);
        }
        return false;
      });

      if (existingChat) {
        setLoadingContacts(false);
        navigation.navigate('ChatDetail', {
          chatId: existingChat.id,
          contactName: existingChat.chatName || contactName,
          contactImage: existingChat.contactImage,
        });
      } else {
        // Create a new chat
        const response = await axios.post(
          'http://192.168.1.60:8000/securetalk/api/social/chats/create',
          { contactId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data && response.data.chat) {
          // Refresh the chat list
          await fetchChats();
          // Navigate to the new chat
          navigation.navigate('ChatDetail', {
            chatId: response.data.chat.id,
            contactName: response.data.chat.chatName || contactName,
            contactImage: response.data.chat.contactImage,
            isNew: response.data.isNew,
          });
        } else {
          Alert.alert('Error', 'Failed to create chat. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error handling contact click:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Format timestamp for chat items
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'contacts':
        return (
          <View style={styles.tabContent}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Contacts</Text>
            </View>
            <Searchbar
              placeholder="Search contacts"
              onChangeText={setContactsSearchQuery}
              value={contactsSearchQuery}
              style={styles.searchBar}
              iconColor={colors.primary}
              clearIcon="close-circle"
            />
            {loadingContacts ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : filteredContacts && filteredContacts.length > 0 ? (
              <FlatList
                data={filteredContacts}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.contactItem}
                    onPress={() => handleOpenContact(item.id, item.fullName)}
                  >
                    <Avatar.Image 
                      source={item.profile_picture.startsWith("https")
                        ? { uri: item.profile_picture }
                        : require('../assets/default-avatar.png')
                      } 
                      size={50} 
                      style={styles.avatar}
                    />
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{item.fullName}</Text>
                      {item.status && (
                        <Text style={styles.contactStatus} numberOfLines={1}>
                          {item.status}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <Divider style={styles.divider} />}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {contactsSearchQuery ? "No contacts found" : "No contacts yet"}
                </Text>
              </View>
            )}
          </View>
        );
      case 'messages':
        return (
          <View style={styles.tabContent}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Messages</Text>
              <TouchableOpacity 
                onPress={handleNewChat}
                style={styles.newChatButton}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.gradientIconButton}
                >
                  <IconButton
                    icon="plus"
                    size={24}
                    iconColor="#FFFFFF"
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Searchbar
              placeholder="Search messages"
              onChangeText={setMessagesSearchQuery}
              value={messagesSearchQuery}
              style={styles.searchBar}
              iconColor={colors.primary}
              clearIcon="close-circle"
            />
            {loadingChats ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : filteredChats && filteredChats.length > 0 ? (
              <FlatList
                data={filteredChats}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.chatItem}
                    onPress={() => handleOpenChat(item.id, item.chatName, item.contactImage)}
                  >
                    <View style={styles.avatarContainer}>
                      <Avatar.Image 
                        source={item.contactImage && item.contactImage.startsWith("https") 
                          ? { uri: item.contactImage }
                          : require('../assets/default-avatar.png')
                        } 
                        size={50} 
                        style={styles.avatar}
                      />
                      {item.unreadCount > 0 && (
                        <Badge style={styles.unreadBadge}>{item.unreadCount}</Badge>
                      )}
                    </View>
                    <View style={styles.chatInfo}>
                      <View style={styles.chatNameTimeRow}>
                        <Text style={styles.chatName}>{item.chatName}</Text>
                        <Text style={styles.chatTime}>
                          {formatTimestamp(item.updatedAt)}
                        </Text>
                      </View>
                      {/* Guard against rendering objects directly */}
                      <Text
                        style={[
                          styles.chatLastMessage,
                          item.unreadCount > 0 && styles.unreadMessage,
                        ]}
                        numberOfLines={1}
                      >
                        {typeof item.last_message === 'object'
                          ? item.last_message.content
                          : item.last_message}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <Divider style={styles.divider} />}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {messagesSearchQuery ? "No messages found" : "No messages yet"}
                </Text>
                <TouchableOpacity onPress={handleNewChat}>
                  <Text style={styles.startChatText}>Start a new conversation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      case 'settings':
        return (
          <View style={styles.tabContent}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <View style={styles.settingsContent}>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => navigation.navigate('EditProfileScreen')}
              >
                <View style={styles.settingsItemIcon}>
                  <MaterialCommunityIcons name="account-edit" size={24} color="#1F2937" />
                </View>
                <Text style={styles.settingsItemText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => navigation.navigate('ChangePasswordScreen')}
              >
                <View style={styles.settingsItemIcon}>
                  <MaterialCommunityIcons name="lock-reset" size={24} color="#1F2937" />
                </View>
                <Text style={styles.settingsItemText}>Change Password</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
                <View style={styles.settingsItemIcon}>
                  <MaterialCommunityIcons name="logout" size={24} color="#EF4444" />
                </View>
                <Text style={[styles.settingsItemText, { color: '#EF4444' }]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        renderIcon={({ route, color }) => {
          const iconName = 
            route.key === 'contacts' ? 'account-multiple' :
            route.key === 'messages' ? 'message-text' :
            'cog';
          return (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name={iconName} color={color} size={24} />
            </View>
          );
        }}
        barStyle={styles.bottomNav}
        activeColor="#4F46E5"
        inactiveColor="#9CA3AF"
        labeled
        shifting
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    height: 68,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  searchBar: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    elevation: 0,
    backgroundColor: '#F3F4F6',
    height: 48,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
  },
  contactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  contactStatus: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: '#F3F4F6',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#10B981',
  },
  chatInfo: {
    marginLeft: 12,
    flex: 1,
  },
  chatNameTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  chatTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  chatLastMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  unreadMessage: {
    color: '#1F2937',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  startChatText: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '600',
    textAlign: 'center',
  },
  newChatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  gradientIconButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  settingsContent: {
    flex: 1,
    padding: 20,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsItemIcon: {
    marginRight: 16,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});