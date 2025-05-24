import { collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from './config';

// Create a new service listing
export const createService = async (serviceData) => {
  try {
    if (!serviceData.providerId) {
      throw new Error('Provider ID is required');
    }

    const servicesRef = collection(db, 'services');
    const docRef = await addDoc(servicesRef, {
      ...serviceData,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    });

    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating service:', error);
    return { id: null, error: error.message };
  }
};

// Get a specific service by ID
export const getService = async (serviceId) => {
  try {
    const serviceRef = doc(db, 'services', serviceId);
    const serviceSnap = await getDoc(serviceRef);
    
    if (serviceSnap.exists()) {
      return { data: { id: serviceSnap.id, ...serviceSnap.data() }, error: null };
    }
    return { data: null, error: 'Service not found' };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// Get all services by provider ID
export const getProviderServices = async (providerId) => {
  try {
    const servicesRef = collection(db, 'services');
    const q = query(servicesRef, where('providerId', '==', providerId));
    const querySnapshot = await getDocs(q);
    
    const services = [];
    querySnapshot.forEach((doc) => {
      services.push({ id: doc.id, ...doc.data() });
    });
    
    return { data: services, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// Update a service
export const updateService = async (serviceId, updateData) => {
  try {
    const serviceRef = doc(db, 'services', serviceId);
    await updateDoc(serviceRef, {
      ...updateData,
      updatedAt: new Date()
    });
    
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Booking functions
export const createBooking = async (bookingData) => {
  try {
    // Validate required fields
    const requiredFields = ['serviceId', 'serviceTitle', 'providerId', 'providerName', 'customerId', 'customerEmail', 'date', 'time'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log('Attempting to create booking with data:', bookingData);

    const bookingsRef = collection(db, 'bookings');
    const docRef = await addDoc(bookingsRef, {
      ...bookingData,
      createdAt: serverTimestamp(),
      status: 'pending'
    });

    console.log('Booking created successfully with ID:', docRef.id);
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating booking:', error);
    // Log more detailed error information
    if (error.code) {
      console.error('Firebase error code:', error.code);
    }
    if (error.message) {
      console.error('Error message:', error.message);
    }
    return { id: null, error: error.message };
  }
};

export const updateBookingStatus = async (bookingId, status) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      status,
      respondedAt: serverTimestamp()
    });
    return { error: null };
  } catch (error) {
    console.error('Error updating booking status:', error);
    return { error: error.message };
  }
};

export const getBookingsByProvider = async (providerId) => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('providerId', '==', providerId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return {
      data: querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      error: null
    };
  } catch (error) {
    console.error('Error fetching provider bookings:', error);
    return { data: null, error: error.message };
  }
};

export const getBookingsByCustomer = async (customerId) => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return {
      data: querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      error: null
    };
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    return { data: null, error: error.message };
  }
}; 