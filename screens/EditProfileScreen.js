import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Platform,
  KeyboardAvoidingView,
  Alert,
  Image,
  ActivityIndicator,
  Modal
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  useTheme, 
  Divider,
  IconButton,
  Appbar
} from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function EditProfileScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false);
  const defaultImage = require("../assets/default-avatar.png");

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

  useEffect(() => {
    // Load user profile data
    const loadProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        if (!token) {
          navigation.replace('SignIn');
          return;
        }

        const response = await axios.get(
          'http://192.168.1.60:8000/securetalk/api/users/user_details',
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data) {
          setFirstName(response.data.first_name);
          setLastName(response.data.last_name);
          setDateOfBirth(new Date(response.data.date_of_birth));
          setGender(response.data.gender);
          setProfilePic(response.data.profile_picture);
        }
      } catch (error) {
        console.error('Failed to load profile', error.message);
      }
    };

    loadProfile();
  }, []);

  const handlePickImage = async () => {
    console.log("Image picker triggered");
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your photo library.');
      return;
    }
  
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
  
    if (!result.cancelled) {
      console.log("Image picked: ", result.assets[0].uri);
      const imageUri = result.assets[0].uri;
      const fileName = imageUri.split('/').pop();
      const fileType = fileName.split('.').pop();
  
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: fileName,
        type: `image/${fileType}`,
      });

      setLoading(true);
  
      try {
        const token = await AsyncStorage.getItem('user_token');
        const response = await axios.post(
          'http://192.168.1.60:8000/securetalk/api/users/upload_profile_pic',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
          }
        );
  
        if (response.data && response.data.imageUrl) {
          setProfilePic(response.data.imageUrl);
          console.log(response.data.imageUrl);
        } else {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        }
      } catch (error) {
        console.error('Failed to upload image', error);
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) {
        navigation.replace('SignIn');
        return;
      }
  
      const response = await axios.put(
        'http://192.168.1.60:8000/securetalk/api/users/update_profile',
        { firstName, lastName, dateOfBirth: dateOfBirth.toISOString().split('T')[0], gender, profilePic },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      if (response.data) {
        Alert.alert('Success', 'Profile updated successfully');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to update profile', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || dateOfBirth;
    setShowDatePicker(Platform.OS === 'ios');
    setDateOfBirth(currentDate);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Appbar.Header style={styles.appbarHeader}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Edit Profile" />
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
            <View style={styles.profilePicContainer}>
              <TouchableOpacity onPress={handlePickImage} style={styles.profilePicWrapper}>
                <Image 
                  source={
                    profilePic && profilePic.startsWith("https") // If it's a remote image, use uri
                    ? { uri: profilePic }
                    : defaultImage // Fallback to default if local path is invalid
                  }
                  style={styles.profilePic} 
                />
                <IconButton 
                  icon="pencil" 
                  size={24} 
                  color={colors.primary} 
                  style={styles.editIcon} 
                />
              </TouchableOpacity>
              <View style={styles.nameFields}>
                <TextInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                  mode="outlined"
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  theme={{ colors }}
                />
                <TextInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                  mode="outlined"
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  theme={{ colors }}
                />
              </View>
            </View>
  
            <Text style={styles.sectionTitle}>Date of Birth</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <IconButton icon="calendar" size={24} color={colors.primary} />
              <Text style={styles.dateText}>
                {dateOfBirth.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </TouchableOpacity>
  
            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="default"
                onChange={onChangeDate}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
              />
            )}
  
            <Text style={styles.sectionTitle}>Gender</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === 'male' && styles.selectedGender
                ]}
                onPress={() => setGender('male')}
              >
                <MaterialCommunityIcons name="gender-male" size={24} color={gender == 'male' ? colors.background : colors.primary} />
                <Text style={[styles.genderText, gender === 'male' && styles.selectedGenderText]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === 'female' && styles.selectedGender
                ]}
                onPress={() => setGender('female')}
              >
                <MaterialCommunityIcons name="gender-female" size={24} color={gender == 'female' ? colors.background : colors.primary} />
                <Text style={[styles.genderText, gender === 'female' && styles.selectedGenderText]}>Female</Text>
              </TouchableOpacity>
            </View>
  
            <TouchableOpacity
              style={styles.saveButtonContainer}
              onPress={handleSave}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Save Changes</Text>
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
  profilePicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicWrapper: {
    position: 'relative',
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 20,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  nameFields: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    flex: 0.48,
  },
  selectedGender: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  genderText: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '500',
    marginLeft: 5,
  },
  selectedGenderText: {
    color: '#FFFFFF',
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