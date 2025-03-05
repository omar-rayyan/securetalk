import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Platform,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  useTheme, 
  Divider,
  IconButton
} from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SignUpScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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

  const handleRegister = () => {
    // Validate inputs
    if (!firstName || !lastName || !email || !password || !confirmPassword || !gender) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    axios.post('http://192.168.1.60:8000/securetalk/api/users/register', { 
      firstName, 
      lastName, 
      email, 
      password, 
      gender, 
      dateOfBirth: dateOfBirth.toISOString().split('T')[0]  // Format to YYYY-MM-DD
    })
      .then(response => {
        const data = response.data;
        if (data.token) {
          // Store the token securely
          AsyncStorage.setItem('user_token', data.token);
          navigation.replace('Home');
        } else {
          Alert.alert('Registration Failed', data.error || 'Please try again');
        }
      })
      .catch(error => {
        if (error.response && error.response.data && error.response.data.errors) {
            const errors = error.response.data.errors;
            const errorMessages = Object.values(errors).join('\n');
            Alert.alert('Validation Errors', errorMessages);
        } else {
            Alert.alert('Error', error.message);
        }
    });
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || dateOfBirth;
    setShowDatePicker(Platform.OS === 'ios');
    setDateOfBirth(currentDate);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.appTitle}>SecureTalk</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
          </View>
          
          <View style={styles.formContainer}>
            {/* Name row */}
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
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
              </View>
              <View style={styles.nameField}>
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

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              keyboardType="email-address"
              autoCapitalize="none"
              theme={{ colors }}
              left={<TextInput.Icon icon="email" color={colors.text} />}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              theme={{ colors }}
              left={<TextInput.Icon icon="lock" color={colors.text} />}
              right={
                <TextInput.Icon 
                  icon={showPassword ? "eye-off" : "eye"} 
                  onPress={() => setShowPassword(!showPassword)}
                  color={colors.text}
                />
              }
            />
            
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              theme={{ colors }}
              left={<TextInput.Icon icon="lock-check" color={colors.text} />}
              right={
                <TextInput.Icon 
                  icon={showConfirmPassword ? "eye-off" : "eye"} 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  color={colors.text}
                />
              }
            />
            
            {/* Gender selection */}
            <Text style={styles.sectionTitle}>Gender</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === 'male' && styles.selectedGender
                ]}
                onPress={() => setGender('male')}
              >
                <MaterialCommunityIcons name="gender-male" size={24} color={gender === 'male' ? colors.background : colors.primary} />
                <Text style={[styles.genderText, gender === 'male' && styles.selectedGenderText]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === 'female' && styles.selectedGender
                ]}
                onPress={() => setGender('female')}
              >
                <MaterialCommunityIcons name="gender-female" size={24} color={gender === 'female' ? colors.background : colors.primary} />
                <Text style={[styles.genderText, gender === 'female' && styles.selectedGenderText]}>Female</Text>
              </TouchableOpacity>
            </View>
            
            {/* Date of birth */}
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
            
            {/* Sign up button */}
            <TouchableOpacity
              style={styles.signupButtonContainer}
              onPress={handleRegister}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Create Account</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <Divider style={styles.divider} />
            
            {/* Login option */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  appTitle: {
    fontWeight: '700',
    fontSize: 24,
    color: '#4F46E5',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 10,
  },
  formContainer: {
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  nameField: {
    flex: 0.48,
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
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  signupButtonContainer: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
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
  divider: {
    marginVertical: 20,
    backgroundColor: '#E5E7EB',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '600',
    marginLeft: 8,
  },
});