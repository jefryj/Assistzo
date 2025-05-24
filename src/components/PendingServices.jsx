import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, or, and } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { FaCalendarAlt, FaClock, FaUser, FaEnvelope, FaPhone, FaComments, FaCheck, FaTimes, FaCheckCircle } from 'react-icons/fa';
import './PendingServices.css';

const PendingServices = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('Please sign in to view pending services');
          return;
        }

        console.log('Fetching requests for provider:', user.uid);

        const requestsRef = collection(db, 'bookings');
        const q = query(
          requestsRef,
          and(
            where('providerId', '==', user.uid),
            or(
              where('status', '==', 'pending'),
              where('status', '==', 'accepted')
            )
          ),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        console.log('Query snapshot size:', querySnapshot.size);

        const requestsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Request data:', data);
          return {
            id: doc.id,
            ...data,
            date: data.date ? new Date(data.date).toISOString() : null,
            createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toISOString() : null
          };
        });

        console.log('Processed requests:', requestsData);
        setRequests(requestsData);
      } catch (error) {
        console.error('Error fetching requests:', error);
        setError(`Failed to fetch pending services: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleRequest = async (requestId, status) => {
    try {
      const requestRef = doc(db, 'bookings', requestId);
      const updateData = {
        status,
        respondedAt: new Date()
      };

      if (status === 'rejected') {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason) {
          updateData.rejectionReason = reason;
        }
      }

      await updateDoc(requestRef, updateData);

      // Update local state
      setRequests(prevRequests =>
        prevRequests.map(request =>
          request.id === requestId
            ? { ...request, ...updateData }
            : request
        )
      );

      alert(`Request ${status} successfully`);
    } catch (error) {
      console.error('Error updating request:', error);
      alert(`Failed to update request status: ${error.message}`);
    }
  };

  const handleMarkAsDone = async (requestId) => {
    try {
      const requestRef = doc(db, 'bookings', requestId);
      const updateData = {
        status: 'completed',
        completedAt: new Date()
      };

      await updateDoc(requestRef, updateData);

      // Update local state
      setRequests(prevRequests =>
        prevRequests.filter(request => request.id !== requestId)
      );

      alert('Service marked as completed successfully');
    } catch (error) {
      console.error('Error marking service as done:', error);
      alert(`Failed to mark service as done: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading pending services...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="pending-services-container">
      <h1>Pending Service Requests</h1>
      
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
                  <FaCalendarAlt /> {request.date ? new Date(request.date).toLocaleDateString() : 'Date not specified'}
                </span>
              </div>

              <div className="request-details">
                <div className="customer-info">
                  <h4>Customer Information</h4>
                  <p><FaUser /> {request.customerName || 'Customer name not available'}</p>
                  <p><FaEnvelope /> {request.customerEmail || 'Customer email not available'}</p>
                  <p><FaPhone /> {request.customerPhone || 'Customer phone not available'}</p>
                </div>

                <div className="booking-info">
                  <h4>Booking Details</h4>
                  <p><FaClock /> {request.time || 'Time not specified'}</p>
                  {request.specialRequests && (
                    <div className="special-requests">
                      <h5><FaComments /> Special Requests</h5>
                      <p>{request.specialRequests}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="request-actions">
                {request.status === 'pending' ? (
                  <>
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
                  </>
                ) : (
                  <button
                    className="complete-button"
                    onClick={() => handleMarkAsDone(request.id)}
                  >
                    <FaCheckCircle /> Mark as Done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingServices; 