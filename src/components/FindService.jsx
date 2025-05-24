import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { createBooking } from '../firebase/services';
import { getUserProfile } from '../firebase/users';
import { FaStar, FaSearch, FaFilter, FaMapMarkerAlt, FaPhone, FaUser, FaCalendarAlt, FaClock, FaComments } from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './FindService.css';

// Fix for default marker icon in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Create custom red marker icon for user location
const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Map marker component with auto-center functionality
function LocationMarker({ position, onLocationUpdate }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position ? <Marker position={position} icon={userLocationIcon} /> : null;
}

const BookingModal = ({ service, onClose, onSubmit }) => {
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    specialRequests: '',
    status: 'pending'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(bookingData);
  };

  return (
    <div className="modal-overlay">
      <div className="booking-modal">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Book Service</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <FaCalendarAlt /> Preferred Date
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={bookingData.date}
                onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
              />
            </label>
          </div>
          
          <div className="form-group">
            <label>
              <FaClock /> Preferred Time
              <input
                type="time"
                required
                value={bookingData.time}
                onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaComments /> Special Requests (Optional)
              <textarea
                value={bookingData.specialRequests}
                onChange={(e) => setBookingData({ ...bookingData, specialRequests: e.target.value })}
                placeholder="Any special requirements or notes for the service provider..."
              />
            </label>
          </div>

          <button type="submit" className="submit-button">Request Booking</button>
        </form>
      </div>
    </div>
  );
};

const RatingModal = ({ service, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ rating, review });
  };

  return (
    <div className="modal-overlay">
      <div className="rating-modal">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Rate Service</h2>
        <form onSubmit={handleSubmit}>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar
                key={star}
                className={`star ${star <= rating ? 'filled' : ''}`}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
          
          <div className="form-group">
            <label>
              <FaComments /> Your Review
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience with this service..."
                required
              />
            </label>
          </div>

          <button type="submit" className="submit-button">Submit Review</button>
        </form>
      </div>
    </div>
  );
};

const FindService = () => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to India's center
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    serviceType: '',
    minRating: 0,
    maxRate: '',
    availability: ''
  });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedServiceForAction, setSelectedServiceForAction] = useState(null);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }

    // Fetch services
    const fetchServices = async () => {
      try {
        const servicesRef = collection(db, 'services');
        const q = query(servicesRef, where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);
        
        const servicesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setServices(servicesData);
        setFilteredServices(servicesData);
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    // Filter services based on search term and filters
    let filtered = services;

    if (searchTerm) {
      filtered = filtered.filter(service => 
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.providerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.serviceType) {
      filtered = filtered.filter(service => service.serviceType === filters.serviceType);
    }

    if (filters.minRating > 0) {
      filtered = filtered.filter(service => (service.averageRating || 0) >= filters.minRating);
    }

    if (filters.maxRate) {
      filtered = filtered.filter(service => service.rate <= parseFloat(filters.maxRate));
    }

    if (filters.availability) {
      filtered = filtered.filter(service => service.availability[filters.availability.toLowerCase()]);
    }

    setFilteredServices(filtered);
  }, [searchTerm, filters, services]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <FaStar
        key={index}
        className={index < rating ? 'star filled' : 'star'}
      />
    ));
  };

  const handleBooking = async (bookingData) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Please sign in to book a service');
        return;
      }

      if (!selectedServiceForAction) {
        alert('No service selected');
        return;
      }

      // Get user's profile to get their full name and phone number
      const { data: userProfile, error: profileError } = await getUserProfile(user.uid);
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw new Error('Could not fetch user profile');
      }

      // Log the service data for debugging
      console.log('Selected service:', selectedServiceForAction);

      const bookingPayload = {
        ...bookingData,
        serviceId: selectedServiceForAction.id,
        serviceTitle: selectedServiceForAction.title,
        providerId: selectedServiceForAction.providerId,
        providerName: selectedServiceForAction.providerName,
        providerEmail: selectedServiceForAction.providerEmail,
        providerPhone: selectedServiceForAction.providerPhone,
        customerId: user.uid,
        customerEmail: user.email,
        customerName: userProfile?.fullName || 'Customer name not available',
        customerPhone: userProfile?.phoneNumber || 'Customer phone not available',
        // Ensure date and time are strings
        date: bookingData.date.toString(),
        time: bookingData.time.toString(),
        createdAt: new Date()
      };

      console.log('Creating booking with payload:', bookingPayload);

      const { id, error } = await createBooking(bookingPayload);

      if (error) {
        throw new Error(error);
      }

      console.log('Booking created successfully with ID:', id);
      alert('Booking request sent successfully!');
      setShowBookingModal(false);
      setSelectedServiceForAction(null);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert(`Failed to create booking: ${error.message}`);
    }
  };

  const handleRating = async (ratingData) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Please sign in to rate a service');
        return;
      }

      if (!selectedServiceForAction) {
        alert('No service selected');
        return;
      }

      // First get the current service data
      const serviceRef = doc(db, 'services', selectedServiceForAction.id);
      const serviceDoc = await getDoc(serviceRef);
      const serviceData = serviceDoc.data();

      // Calculate new rating values
      const currentTotalRatings = serviceData.totalRatings || 0;
      const currentAverageRating = serviceData.averageRating || 0;
      const newTotalRatings = currentTotalRatings + 1;
      const newAverageRating = ((currentAverageRating * currentTotalRatings) + ratingData.rating) / newTotalRatings;

      // Create a new batch
      const batch = writeBatch(db);

      // Add the rating document
      const ratingRef = doc(collection(db, 'ratings'));
      batch.set(ratingRef, {
        ...ratingData,
        serviceId: selectedServiceForAction.id,
        serviceTitle: selectedServiceForAction.title,
        providerId: selectedServiceForAction.providerId,
        customerId: user.uid,
        customerEmail: user.email,
        createdAt: serverTimestamp()
      });

      // Update the service document
      batch.update(serviceRef, {
        totalRatings: newTotalRatings,
        averageRating: parseFloat(newAverageRating.toFixed(1))
      });

      // Commit the batch
      await batch.commit();

      // Update local state
      setServices(prevServices =>
        prevServices.map(service =>
          service.id === selectedServiceForAction.id
            ? {
                ...service,
                totalRatings: newTotalRatings,
                averageRating: parseFloat(newAverageRating.toFixed(1))
              }
            : service
        )
      );

      alert('Rating submitted successfully!');
      setShowRatingModal(false);
      setSelectedServiceForAction(null);
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    }
  };

  const openBookingModal = (service) => {
    setSelectedServiceForAction(service);
    setShowBookingModal(true);
  };

  const openRatingModal = (service) => {
    setSelectedServiceForAction(service);
    setShowRatingModal(true);
  };

  return (
    <div className="find-service-container">
      <div className="map-section">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={mapCenter} />
          {filteredServices.map(service => (
            <Marker
              key={service.id}
              position={[service.location.latitude, service.location.longitude]}
              eventHandlers={{
                click: () => setSelectedService(service)
              }}
            >
              <Popup>
                <div className="info-window">
                  <h3>{service.title}</h3>
                  <p>{service.providerName}</p>
                  <p>Rs {service.rate} {service.rateType}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="services-section">
        <div className="search-filter-container">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          <div className="filters">
            <select
              name="serviceType"
              value={filters.serviceType}
              onChange={handleFilterChange}
            >
              <option value="">All Services</option>
              <option value="cleaning">Cleaning</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="carpentry">Carpentry</option>
              <option value="painting">Painting</option>
              <option value="gardening">Gardening</option>
              <option value="tuition">Tuition</option>
              <option value="taxi">Taxi Driver</option>
              <option value="cook">Cook</option>
            </select>

            <select
              name="minRating"
              value={filters.minRating}
              onChange={handleFilterChange}
            >
              <option value="0">Any Rating</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="2">2+ Stars</option>
            </select>

            <select
              name="maxRate"
              value={filters.maxRate}
              onChange={handleFilterChange}
            >
              <option value="">Any Rate</option>
              <option value="50">Under Rs 50</option>
              <option value="100">Under Rs 100</option>
              <option value="200">Under Rs 200</option>
            </select>

            <select
              name="availability"
              value={filters.availability}
              onChange={handleFilterChange}
            >
              <option value="">Any Day</option>
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>
        </div>

        <div className="services-list">
          {filteredServices.map(service => (
            <div 
              key={service.id} 
              className={`service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
              onClick={() => setSelectedService(service)}
            >
              <div className="service-header">
                <h3>{service.title}</h3>
                <div className="rating">
                  {renderStars(service.averageRating || 0)}
                  <span className="rating-count">
                    ({service.totalRatings || 0} {service.totalRatings === 1 ? 'rating' : 'ratings'})
                  </span>
                </div>
              </div>
              
              <div className="service-info">
                <p className="provider-name">
                  <FaUser /> {service.providerName}
                </p>
                <p className="provider-phone">
                  <FaPhone /> {service.providerPhone}
                </p>
                <p className="provider-address">
                  <FaMapMarkerAlt /> {service.providerAddress.address}, {service.providerAddress.city}
                </p>
              </div>

              <p className="service-description">{service.description}</p>
              
              <div className="service-footer">
                <span className="rate">Rs {service.rate} {service.rateType}</span>
                <span className="experience">{service.experience} years experience</span>
              </div>

              <div className="availability">
                <h4>Available on:</h4>
                <div className="availability-days">
                  {Object.entries(service.availability).map(([day, available]) => (
                    <span key={day} className={available ? 'available' : 'unavailable'}>
                      {day.slice(0, 3)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="service-actions">
                <button 
                  className="action-button book"
                  onClick={(e) => {
                    e.stopPropagation();
                    openBookingModal(service);
                  }}
                >
                  Book Now
                </button>
                <button 
                  className="action-button rate"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRatingModal(service);
                  }}
                >
                  Rate Service
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showBookingModal && selectedServiceForAction && (
        <BookingModal
          service={selectedServiceForAction}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedServiceForAction(null);
          }}
          onSubmit={handleBooking}
        />
      )}

      {showRatingModal && selectedServiceForAction && (
        <RatingModal
          service={selectedServiceForAction}
          onClose={() => {
            setShowRatingModal(false);
            setSelectedServiceForAction(null);
          }}
          onSubmit={handleRating}
        />
      )}
    </div>
  );
};

export default FindService;
