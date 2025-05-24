import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { FaCalendarAlt, FaClock, FaUser, FaEnvelope, FaPhone, FaComments, FaCheck, FaTimes } from 'react-icons/fa';
import './ServiceRequests.css';

const ServiceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('Please sign in to view service requests');
          return;
        }

        const requestsRef = collection(db, 'bookings');
        const q = query(
          requestsRef,
          where('providerId', '==', user.uid),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const requestsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setRequests(requestsData);
      } catch (error) {
        console.error('Error fetching requests:', error);
        setError('Failed to fetch service requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleRequest = async (requestId, status) => {
    try {
      const requestRef = doc(db, 'bookings', requestId);
      await updateDoc(requestRef, {
        status,
        respondedAt: new Date()
      });

      // Update local state
      setRequests(prevRequests =>
        prevRequests.map(request =>
          request.id === requestId
            ? { ...request, status }
            : request
        )
      );
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request status');
    }
  };

  if (loading) {
    return <div className="loading">Loading service requests...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="service-requests-container">
      <h1>Service Requests</h1>
      
      {requests.length === 0 ? (
        <div className="no-requests">
          <p>No pending service requests</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <h3>{request.serviceTitle}</h3>
                <span className="request-date">
                  <FaCalendarAlt /> {new Date(request.date).toLocaleDateString()}
                </span>
              </div>

              <div className="request-details">
                <div className="customer-info">
                  <h4>Customer Information</h4>
                  <p><FaUser /> {request.customerName || 'Anonymous'}</p>
                  <p><FaEnvelope /> {request.customerEmail}</p>
                  {request.customerPhone && (
                    <p><FaPhone /> {request.customerPhone}</p>
                  )}
                </div>

                <div className="booking-info">
                  <h4>Booking Details</h4>
                  <p><FaClock /> {request.time}</p>
                  {request.specialRequests && (
                    <div className="special-requests">
                      <h5><FaComments /> Special Requests</h5>
                      <p>{request.specialRequests}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="request-actions">
                <button
                  className="accept-button"
                  onClick={() => handleRequest(request.id, 'accepted')}
                >
                  <FaCheck /> Accept
                </button>
                <button
                  className="reject-button"
                  onClick={() => handleRequest(request.id, 'rejected')}
                >
                  <FaTimes /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceRequests; 