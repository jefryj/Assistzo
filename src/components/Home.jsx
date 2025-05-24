import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOutUser } from '../firebase/auth';
import { FaTools, FaSearch, FaClock, FaListAlt, FaUser, FaSignOutAlt, FaHome } from 'react-icons/fa';
import './Home.css';

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      if (user?.displayName) {
        // Extract first name from display name
        const firstName = user.displayName.split(' ')[0];
        setUserName(firstName);
      } else if (user?.email) {
        // If no display name, use email username
        const emailUsername = user.email.split('@')[0];
        setUserName(emailUsername);
      } else {
        setUserName('');
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await signOutUser();
      if (!error) {
        navigate('/login');
      } else {
        console.error('Logout error:', error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="home-container">
      <nav className="navbar">
        <div className="brand">
          <FaHome className="brand-icon" />
          <span>Assistzo</span>
        </div>
        <div className="nav-links">
          {isAuthenticated ? (
            <>
              <div className="user-welcome">
                <FaUser className="user-icon" />
                <span>{userName ? `Welcome, ${userName}` : 'Welcome'}</span>
              </div>
              <button onClick={handleLogout} className="nav-link logout-button">
                <FaSignOutAlt className="logout-icon" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link login-button">
                <span>Login</span>
              </Link>
              <Link to="/signup" className="nav-link signup-button">
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      </nav>
      
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Assistzo</h1>
          <p className="hero-subtitle">Your trusted platform for local services</p>
          
          <div className="service-options">
            <Link to="/provide-service" className="service-button provide">
              <div className="button-content">
                <FaTools className="icon" />
                <span>Provide Service</span>
                <p className="button-description">Offer your expertise to the community</p>
              </div>
            </Link>
            <Link to="/find-service" className="service-button find">
              <div className="button-content">
                <FaSearch className="icon" />
                <span>Find Service</span>
                <p className="button-description">Discover local service providers</p>
              </div>
            </Link>
            <Link to="/pending-services" className="service-button pending">
              <div className="button-content">
                <FaClock className="icon" />
                <span>Pending Services</span>
                <p className="button-description">Manage your service requests</p>
              </div>
            </Link>
            <Link to="/requested-services" className="service-button requested">
              <div className="button-content">
                <FaListAlt className="icon" />
                <span>Requested Services</span>
                <p className="button-description">Track your service bookings</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="features-section">
        <h2>Why Choose Assistzo?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Trusted Professionals</h3>
            <p>All service providers are verified and rated by the community</p>
          </div>
          <div className="feature-card">
            <h3>Easy Booking</h3>
            <p>Simple and quick booking process for all services</p>
          </div>
          <div className="feature-card">
            <h3> Secure & Reliable</h3>
            <p>Your data stays safe with us. Authentication ensures only real users get access.</p>
          </div>
          <div className="feature-card">
            <h3>24/7 Support</h3>
            <p>Round-the-clock customer support for all your needs</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
