import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmail, signInWithGoogle } from '../firebase/auth';

const Login = () => {
  const navigate = useNavigate();
  const [currentQuote, setCurrentQuote] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const quotes = [
    {
      text: "Your success is our priority",
      author: "Assistzo Team"
    },
    {
      text: "Connecting talent with opportunity",
      author: "Assistzo Vision"
    },
    {
      text: "Making work easier, one task at a time",
      author: "Assistzo Mission"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    // Clear any previous errors when user starts typing
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user, error: signInError } = await signInWithEmail(formData.email, formData.password);
      
      if (signInError) {
        setError(signInError);
      } else if (user) {
        // Successful login
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
      } else if (user) {
        // Successful Google sign-in
        navigate('/home');
      }
    } catch (err) {
      setError('An unexpected error occurred with Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <h1 className="brand-name">Assistzo</h1>
        <div className="quotes-container">
          {quotes.map((quote, index) => (
            <div
              key={index}
              className={`quote ${index === currentQuote ? 'active' : ''}`}
            >
              <p className="quote-text">{quote.text}</p>
              <p className="quote-author">- {quote.author}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="login-right">
        <div className="login-content">
          <div className="login-header">
            <h1 className="login-title">Login</h1>
            <p className="tagline">Welcome back!</p>
          </div>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <button 
                type="submit" 
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
            <div className="form-group">
              <button 
                type="button"
                onClick={handleGoogleSignIn}
                className="login-button google-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>
            <div className="form-footer">
              <a href="#" className="forgot-password">Forgot Password?</a>
              <p className="signup-text">
                Don't have an account? <Link to="/signup" className="signup-link">Sign up</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
