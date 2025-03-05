import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getCurrentUserId = async () => {
  try {
    const token = await AsyncStorage.getItem('user_token');
    if (!token) return null;

    const decodedToken = jwtDecode(token);
    return decodedToken.user_id;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export default getCurrentUserId;