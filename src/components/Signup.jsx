import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUpWithEmail, signInWithGoogle } from '../firebase/auth';
import { createUserProfile } from '../firebase/users';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Map marker component
function LocationMarker({ position, onLocationUpdate }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  useEffect(() => {
    map.on('click', (e) => {
      onLocationUpdate([e.latlng.lat, e.latlng.lng]);
    });
  }, [map, onLocationUpdate]);

  return position ? <Marker position={position} /> : null;
}

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    country: '',
    state: '',
    city: '',
    address: '',
    zipCode: '',
    location: {
      latitude: null,
      longitude: null
    }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState({
    message: 'Click on the map to select your location or allow location access',
    type: 'info'
  });
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to India's center
  const [markerPosition, setMarkerPosition] = useState(null);

  // Add state for quote rotation
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const quotes = [
    {
      text: "Connecting Hearts, Building Trust",
      author: "Where Service Meets Care"
    },
    {
      text: "Your Trusted Partner in Daily Life",
      author: "Making Life Easier"
    },
    {
      text: "Quality Service, Every Time",
      author: "Excellence in Action"
    }
  ];

  // Rotate quotes every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveQuoteIndex((current) => (current + 1) % quotes.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Get user's location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      setLocationStatus({
        message: 'Detecting your location...',
        type: 'info'
      });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            location: { latitude, longitude }
          }));
          setMapCenter([latitude, longitude]);
          setMarkerPosition([latitude, longitude]);
          setLocationStatus({
            message: 'Location detected successfully',
            type: 'success'
          });
        },
        (error) => {
          let errorMessage = 'Failed to detect location. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'Please select your location on the map.';
          }
          setLocationStatus({
            message: errorMessage,
            type: 'error'
          });
        }
      );
    } else {
      setLocationStatus({
        message: 'Geolocation is not supported by your browser',
        type: 'error'
      });
    }
  }, []);

  const handleLocationUpdate = ([lat, lng]) => {
    setMarkerPosition([lat, lng]);
    setFormData(prev => ({
      ...prev,
      location: {
        latitude: lat,
        longitude: lng
      }
    }));
    setLocationStatus({
      message: 'Location selected successfully',
      type: 'success'
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return false;
    }
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError('Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const { user, error: signUpError } = await signUpWithEmail(formData.email, formData.password);
      
      if (signUpError) {
        setError(signUpError);
        setLoading(false);
        return;
      }

      if (user) {
        const profileData = {
          fullName: formData.fullName,
          email: formData.email,
          userType: 'user',
          phoneNumber: formData.phoneNumber,
          country: formData.country,
          state: formData.state,
          city: formData.city,
          address: formData.address,
          zipCode: formData.zipCode,
          location: {
            latitude: formData.location.latitude,
            longitude: formData.location.longitude
          },
          createdVia: 'email',
          isProfileComplete: true,
          registrationDate: new Date(),
          lastUpdated: new Date(),
          isActive: true,
          emailVerified: user.emailVerified,
          preferences: {
            notifications: true,
            newsletter: true
          }
        };

        const { error: profileError } = await createUserProfile(user.uid, profileData);
        
        if (profileError) {
          setError('Account created but failed to save profile details. Please try again or update your profile later.');
          navigate('/home');
          return;
        }

        navigate('/home');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const { user, error: googleError } = await signInWithGoogle();
      
      if (googleError) {
        setError(googleError);
        return;
      }

      if (user) {
        const profileData = {
          fullName: user.displayName || '',
          email: user.email,
          userType: 'user',
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber || formData.phoneNumber || '',
          country: formData.country || '',
          state: formData.state || '',
          city: formData.city || '',
          address: formData.address || '',
          zipCode: formData.zipCode || '',
          location: {
            latitude: formData.location.latitude,
            longitude: formData.location.longitude
          },
          createdVia: 'google',
          isProfileComplete: false,
          registrationDate: new Date(),
          lastUpdated: new Date(),
          lastSignInTime: new Date(),
          isActive: true,
          emailVerified: user.emailVerified,
          googleData: {
            providerId: 'google.com',
            googleId: user.uid,
          },
          preferences: {
            notifications: true,
            newsletter: true
          }
        };

        const { error: profileError } = await createUserProfile(user.uid, profileData);
        
        if (profileError) {
          setError('Signed in but failed to save profile details. Please update your profile in settings.');
          navigate('/home');
          return;
        }

        navigate('/home');
      }
    } catch (err) {
      setError('An unexpected error occurred with Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-left">
        <div className="brand-container">
          <h1 className="brand-name">Assistzo</h1>
          <div className="quotes-container">
            {quotes.map((quote, index) => (
              <div key={index} className={`quote ${index === activeQuoteIndex ? 'active' : ''}`}>
                <p className="quote-text">"{quote.text}"</p>
                <p className="quote-author">- {quote.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="signup-right">
        <div className="signup-content">
          <div className="signup-header">
            <h2 className="signup-title">Create Account</h2>
            <p className="signup-subtitle">Join our community</p>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name*</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email*</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number*</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Enter your phone number"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Country*</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Enter your country"
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="state">State*</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Enter your state"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">City*</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter your city"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address*</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter your address"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="zipCode">ZIP Code*</label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                placeholder="Enter your ZIP code"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Your Location</label>
              <div className="map-container">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker 
                    position={markerPosition}
                    onLocationUpdate={handleLocationUpdate}
                  />
                </MapContainer>
              </div>
              <div className={`location-status ${locationStatus.type}`}>
                {locationStatus.message}
                {formData.location.latitude && formData.location.longitude && (
                  <div className="location-coordinates">
                    Selected coordinates: {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password*</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
                disabled={loading}
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password*</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                disabled={loading}
                minLength="6"
              />
            </div>

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <button 
              type="button"
              className="google-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign up with Google'}
            </button>

            <div className="form-footer">
              <p>
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup; 