import { doc, setDoc, getDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from './config';

// Create or update user profile in Firestore
export const createUserProfile = async (userId, userData) => {
  try {
    if (!userId) {
      console.error('No userId provided to createUserProfile');
      return { error: 'No userId provided' };
    }

    console.log('Creating user profile for:', userId);
    console.log('User data:', userData);

    // Create references for both basic and detailed profile
    const userRef = doc(db, 'users', userId);
    const userProfileRef = doc(db, 'userProfiles', userId);
    
    // Basic user data for 'users' collection
    const basicData = {
      fullName: userData.fullName,
      email: userData.email,
      userType: userData.userType || 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      uid: userId
    };

    // Detailed profile data for 'userProfiles' collection
    const profileData = {
      ...userData,
      uid: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Remove any undefined or null values
      ...Object.fromEntries(
        Object.entries(userData).filter(([_, v]) => v != null && v !== '')
      )
    };

    // Create/update both documents
    await Promise.all([
      setDoc(userRef, basicData, { merge: true }),
      setDoc(userProfileRef, profileData, { merge: true })
    ]);

    console.log('Successfully created user profile and detailed profile');
    return { error: null };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { error: error.message };
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const userProfileRef = doc(db, 'userProfiles', userId);
    const profileSnap = await getDoc(userProfileRef);
    
    if (profileSnap.exists()) {
      return { data: profileSnap.data(), error: null };
    }
    return { data: null, error: 'User profile not found' };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// Update user profile
export const updateUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userProfileRef = doc(db, 'userProfiles', userId);

    const updates = {
      ...userData,
      updatedAt: new Date()
    };

    // Update both basic and detailed profiles
    await Promise.all([
      updateDoc(userRef, {
        fullName: userData.fullName,
        email: userData.email,
        updatedAt: new Date()
      }),
      updateDoc(userProfileRef, updates)
    ]);

    return { error: null };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { error: error.message };
  }
};

// Get all user profiles (for admin purposes)
export const getAllUserProfiles = async () => {
  try {
    const profilesRef = collection(db, 'userProfiles');
    const profilesSnap = await getDoc(profilesRef);
    const profiles = [];
    
    profilesSnap.forEach((doc) => {
      profiles.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { data: profiles, error: null };
  } catch (error) {
    console.error('Error fetching all profiles:', error);
    return { data: null, error: error.message };
  }
}; 