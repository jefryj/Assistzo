import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { FaCalendarAlt, FaClock, FaUser, FaEnvelope, FaPhone, FaComments, FaCheck, FaTimes, FaHourglassHalf, FaStar } from 'react-icons/fa';
import './RequestedServices.css';

const RequestedServices = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState({});

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('Please sign in to view your service requests');
          return;
        }

        console.log('Fetching requests for customer:', user.uid);

        const requestsRef = collection(db, 'bookings');
        const q = query(
          requestsRef,
          where('customerId', '==', user.uid)
        );

        const querySnapshot = await getDocs(q);
        console.log('Query snapshot size:', querySnapshot.size);

        const requestsData = await Promise.all(querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          console.log('Request data:', data);

          // Fetch provider information from services collection
          let providerInfo = {};
          if (data.serviceId) {
            try {
              const serviceDoc = await getDoc(doc(db, 'services', data.serviceId));
              if (serviceDoc.exists()) {
                const serviceData = serviceDoc.data();
                providerInfo = {
                  providerName: serviceData.providerName,
                  providerEmail: serviceData.providerEmail,
                  providerPhone: serviceData.providerPhone
                };
              }
            } catch (error) {
              console.error('Error fetching service data:', error);
            }
          }

          return {
            id: doc.id,
            ...data,
            ...providerInfo,
            date: data.date ? new Date(data.date).toISOString() : null,
            createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toISOString() : null
          };
        }));

        // Sort the requests by createdAt date in memory
        requestsData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });

        console.log('Processed requests:', requestsData);
        setRequests(requestsData);
      } catch (error) {
        console.error('Error fetching requests:', error);
        setError(`Failed to fetch service requests: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <FaCheck className="status-icon accepted" />;
      case 'rejected':
        return <FaTimes className="status-icon rejected" />;
      case 'completed':
        return <FaCheck className="status-icon completed" />;
      default:
        return <FaHourglassHalf className="status-icon pending" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'completed':
        return 'Completed';
      default:
        return 'Pending';
    }
  };

  const handleRating = async (requestId, ratingValue) => {
    try {
      const requestRef = doc(db, 'bookings', requestId);
      const requestDoc = await getDoc(requestRef);
      const requestData = requestDoc.data();

      // Get the service document
      const serviceRef = doc(db, 'services', requestData.serviceId);
      const serviceDoc = await getDoc(serviceRef);
      const serviceData = serviceDoc.data();

      // Calculate new average rating
      const currentTotalRatings = serviceData.totalRatings || 0;
      const currentAverageRating = serviceData.averageRating || 0;
      const newTotalRatings = currentTotalRatings + 1;
      const newAverageRating = ((currentAverageRating * currentTotalRatings) + ratingValue) / newTotalRatings;

      // Create a new batch
      const batch = writeBatch(db);

      // Update the booking with the new rating
      batch.update(requestRef, {
        rating: ratingValue,
        ratedAt: serverTimestamp()
      });

      // Update the service document with new rating data
      batch.update(serviceRef, {
        totalRatings: newTotalRatings,
        averageRating: parseFloat(newAverageRating.toFixed(1))
      });

      // Commit the batch
      await batch.commit();

      // Update local state
      setRequests(prevRequests =>
        prevRequests.map(request =>
          request.id === requestId
            ? { ...request, rating: ratingValue, ratedAt: new Date() }
            : request
        )
      );

      setRating(prev => ({ ...prev, [requestId]: ratingValue }));
      alert('Thank you for your rating!');
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert(`Failed to submit rating: ${error.message}`);
    }
  };

  const renderRatingStars = (requestId, currentRating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar
          key={i}
          className={`star ${i <= (rating[requestId] || currentRating || 0) ? 'filled' : ''}`}
          onClick={() => handleRating(requestId, i)}
        />
      );
    }
    return <div className="rating-stars">{stars}</div>;
  };

  if (loading) {
    return <div className="loading">Loading your service requests...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="requested-services-container">
      <h1>Your Service Requests</h1>
      
      {requests.length === 0 ? (
        <div className="no-requests">
          <p>You haven't made any service requests yet</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <h3>{request.serviceTitle}</h3>
                <div className="request-status">
                  {getStatusIcon(request.status)}
                  <span className={`status-text ${request.status}`}>
                    {getStatusText(request.status)}
                  </span>
                </div>
              </div>

              <div className="request-details">
                <div className="provider-info">
                  <h4>Service Provider Information</h4>
                  <p><FaUser /> {request.providerName || 'Provider name not available'}</p>
                  <p><FaEnvelope /> {request.providerEmail || 'Provider email not available'}</p>
                  <p><FaPhone /> {request.providerPhone || 'Provider phone not available'}</p>
                </div>

                <div className="booking-info">
                  <h4>Booking Details</h4>
                  <p><FaCalendarAlt /> {request.date ? new Date(request.date).toLocaleDateString() : 'Date not specified'}</p>
                  <p><FaClock /> {request.time || 'Time not specified'}</p>
                  {request.specialRequests && (
                    <div className="special-requests">
                      <h5><FaComments /> Special Requests</h5>
                      <p>{request.specialRequests}</p>
                    </div>
                  )}
                </div>
              </div>

              {request.status === 'rejected' && request.rejectionReason && (
                <div className="rejection-reason">
                  <h5>Reason for Rejection</h5>
                  <p>{request.rejectionReason}</p>
                </div>
              )}

              {request.status === 'completed' && (
                <div className="rating-section">
                  <h5>Rate this service</h5>
                  {renderRatingStars(request.id, request.rating)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestedServices; 