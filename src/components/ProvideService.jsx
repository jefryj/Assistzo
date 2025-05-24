import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { auth } from '../firebase/config';
import { createService } from '../firebase/services';
import { getUserProfile } from '../firebase/users';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

const ProvideService = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    serviceType: '',
    title: '',
    description: '',
    rate: '',
    rateType: 'hourly', // hourly or fixed
    experience: '',
    availability: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    },
    location: {
      latitude: null,
      longitude: null,
      address: ''
    }
  });

  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to India's center
  const [markerPosition, setMarkerPosition] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setMarkerPosition([latitude, longitude]);
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              latitude,
              longitude
            }
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please select it manually on the map.');
        }
      );
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('availability.')) {
      const day = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        availability: {
          ...prev.availability,
          [day]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) : value
      }));
    }
  };

  const handleLocationUpdate = ([lat, lng]) => {
    setMarkerPosition([lat, lng]);
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        latitude: lat,
        longitude: lng
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const user = auth.currentUser;

      if (!user) {
        setError('You must be logged in to provide a service. Please sign in first.');
        return;
      }

      // Get user's profile to get their full name, address and phone number
      const { data: userProfile, error: profileError } = await getUserProfile(user.uid);
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw new Error('Could not fetch user profile');
      }

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Validate required fields
      if (!formData.serviceType || !formData.title || !formData.description || !formData.rate) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate location
      if (!formData.location.latitude || !formData.location.longitude) {
        setError('Please select a location on the map');
        return;
      }

      const serviceData = {
        ...formData,
        providerId: user.uid,
        providerEmail: user.email,
        providerName: userProfile.fullName || 'Unknown Provider',
        providerPhone: userProfile.phoneNumber || '',
        providerAddress: {
          address: userProfile.address || '',
          city: userProfile.city || '',
          state: userProfile.state || '',
          country: userProfile.country || '',
          zipCode: userProfile.zipCode || ''
        },
        rate: parseFloat(formData.rate),
        experience: parseFloat(formData.experience),
        createdAt: new Date(),
        status: 'active'
      };

      console.log('Submitting service data:', serviceData);

      const { id, error: serviceError } = await createService(serviceData);
      
      if (serviceError) {
        console.error('Error creating service:', serviceError);
        throw new Error(serviceError);
      }

      setSuccess('Service successfully added!');
      
      // Reset form
      setFormData({
        serviceType: '',
        title: '',
        description: '',
        rate: '',
        rateType: 'hourly',
        experience: '',
        availability: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        },
        location: {
          latitude: null,
          longitude: null,
          address: ''
        }
      });
      setMarkerPosition(null);

      // Navigate to homepage after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'An error occurred while creating the service');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="provide-service-container">
      <h1>Provide a Service</h1>
      <form onSubmit={handleSubmit} className="service-form">
        <div className="form-group">
          <label htmlFor="serviceType">Service Type</label>
          <select
            id="serviceType"
            name="serviceType"
            value={formData.serviceType}
            onChange={handleChange}
            required
          >
            <option value="">Select a service type</option>
            <option value="cleaning">Cleaning</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="carpentry">Carpentry</option>
            <option value="painting">Painting</option>
            <option value="gardening">Gardening</option>
            <option value="tuition">Tuition</option>
            <option value="taxi">Taxi Driver</option>
            <option value="cook">Cook</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="title">Service Title</label>
          <input
            type="text"
            id="title"
            name="title"
            placeholder="Enter a title for your service"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Describe your service in detail"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="rate">Rate</label>
          <div className="rate-input-group">
            <input
              type="number"
              id="rate"
              name="rate"
              placeholder="Enter your rate"
              value={formData.rate}
              onChange={handleChange}
              required
            />
            <select
              name="rateType"
              value={formData.rateType}
              onChange={handleChange}
            >
              <option value="hourly">per hour</option>
              <option value="fixed">fixed price</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="experience">Years of Experience</label>
          <input
            type="number"
            id="experience"
            name="experience"
            placeholder="Enter your years of experience"
            value={formData.experience}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Availability</label>
          <div className="availability-grid">
            {Object.keys(formData.availability).map(day => (
              <label key={day} className="availability-item">
                <input
                  type="checkbox"
                  name={`availability.${day}`}
                  checked={formData.availability[day]}
                  onChange={handleChange}
                />
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Service Location</label>
          <div className="map-container" style={{ height: '400px', width: '100%', borderRadius: '12px' }}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
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
          {markerPosition && (
            <div className="location-coordinates">
              Selected coordinates: {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          type="submit"
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Provide Service'}
        </button>
      </form>
    </div>
  );
};

export default ProvideService;
