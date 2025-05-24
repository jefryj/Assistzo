import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase/config';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import ProvideService from './components/ProvideService';
import FindService from './components/FindService';
import PendingServices from './components/PendingServices';
import RequestedServices from './components/RequestedServices';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/home" : "/login"} />} 
          />
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/home" /> : <Login />} 
          />
          <Route 
            path="/signup" 
            element={<Signup />} 
          />
          <Route 
            path="/provide-service" 
            element={isAuthenticated ? <ProvideService /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/find-service" 
            element={isAuthenticated ? <FindService /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/home" 
            element={isAuthenticated ? <Home /> : <Navigate to="/login" />} 
          />
          <Route path="/pending-services" element={<PendingServices />} />
          <Route path="/requested-services" element={<RequestedServices />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;