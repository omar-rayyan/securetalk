import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const ChatDetailHeader = ({ contactName, contactImage, onBackPress }) => {
  const defaultImage = require("../assets/default-avatar.png"); // Use require for the default image

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Image
          style={styles.avatar}
          source={
            contactImage && contactImage.startsWith("https")
              ? { uri: contactImage }
              : defaultImage
          }
        />
        <Text style={styles.contactName}>{contactName}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    elevation: 4,
  },
  backButton: {
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contactName: {
    flex: 1,
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default ChatDetailHeader;