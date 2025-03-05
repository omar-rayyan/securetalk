import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  KeyboardAvoidingView, 
  Alert, 
  Platform,
  Modal 
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  useTheme, 
  IconButton, 
  Appbar, 
  ActivityIndicator 
} from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  
  // Custom theme colors
  const colors = {
    primary: '#4F46E5', // Modern indigo
    secondary: '#818CF8', // Lighter indigo
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#1F2937',
    border: '#E5E7EB',
    error: '#EF4444',
  };

  const handleChangePassword = async () => {

    if (!newPassword || !confirmPassword || !currentPassword) {
        Alert.alert('Error', 'Please fill in all fields.');
        return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match.');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) {
        navigation.replace('SignIn');
        return;
      }

      const response = await axios.put(
        'http://192.168.1.60:8000/securetalk/api/users/change_password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        Alert.alert('Success', 'Password changed successfully');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to change password', error);
      const errors = error.response.data.errors;
      const errorMessages = Object.values(errors).join('\n');
      Alert.alert('Error', errorMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Appbar.Header style={styles.appbarHeader}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Change Password" />
      </Appbar.Header>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              theme={{ colors }}
            />
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              theme={{ colors }}
            />
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              theme={{ colors }}
            />
            <TouchableOpacity
              style={styles.saveButtonContainer}
              onPress={handleChangePassword}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Change Password</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {loading && (
        <Modal
          transparent={true}
          animationType="none"
          visible={loading}
          onRequestClose={() => {}}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 0, // Ensure no padding at the top
  },
  appbarHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  keyboardAvoid: {
    flex: 1,
    marginTop: 56, // Adjust to account for the Appbar.Header height
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  saveButtonContainer: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 20,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});