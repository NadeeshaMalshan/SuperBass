import React, { useState } from 'react';
import axios from 'axios';
import './worker.css';

export default function WorkerRegister() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    location: '',
    hourlyRate: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Connect to ASP.NET Core Workers API
      const res = await axios.post('http://localhost:5237/api/workers', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        description: formData.description,
        location: formData.location,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        isAvailable: true
      });

      console.log('Worker registered:', res.data);
      setMessage({ type: 'success', text: 'Worker account created successfully! Redirecting to login...' });
      
      setTimeout(() => {
        navigate('/worker/login');
      }, 1500);
    } catch (err) {
      console.error('Registration failed:', err);
      setMessage({ type: 'error', text: 'Failed to create worker account. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '40px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/iconWithText-cropped.png" 
            alt="SuperBass Logo" 
            style={{ height: '60px', cursor: 'pointer', marginBottom: '16px' }} 
            onClick={() => navigate('/')}
          />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111111' }}>Join as a Skilled Worker</h2>
          <p style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '6px' }}>
            Offer your services to local residents & grow your business
          </p>
        </div>

        {message && (
          <div className={`badge ${message.type === 'success' ? 'badge-success' : 'badge-danger'}`} style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '20px',
            justifyContent: 'center'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="worker-input-group">
            <label className="worker-label">Full Name *</label>
            <input 
              type="text" 
              name="name" 
              required
              className="worker-input"
              placeholder="e.g. David Perera" 
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="worker-input-group">
            <label className="worker-label">Email Address *</label>
            <input 
              type="email" 
              name="email" 
              required
              className="worker-input"
              placeholder="david@example.com" 
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="worker-input-group">
            <label className="worker-label">Phone Number *</label>
            <input 
              type="tel" 
              name="phone" 
              required
              className="worker-input"
              placeholder="+94 77 123 4567" 
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="worker-input-group">
            <label className="worker-label">Primary Location / City</label>
            <input 
              type="text" 
              name="location" 
              className="worker-input"
              placeholder="e.g. Colombo, Kandy, Galle" 
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div className="worker-input-group">
            <label className="worker-label">Hourly Rate (LKR)</label>
            <input 
              type="number" 
              name="hourlyRate" 
              className="worker-input"
              placeholder="e.g. 1500" 
              value={formData.hourlyRate}
              onChange={handleChange}
            />
          </div>

          <div className="worker-input-group">
            <label className="worker-label">Short Description / Experience</label>
            <textarea 
              name="description" 
              className="worker-textarea"
              rows="3"
              placeholder="Describe your skills, experience, and trade specialization..."
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>

          <button 
            type="submit" 
            className="worker-btn-primary" 
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', height: '50px', fontSize: '1rem', marginTop: '12px' }}
          >
            {loading ? 'Creating Account...' : 'Register as Worker'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#64748B' }}>
          Already registered?{' '}
          <span 
            onClick={() => navigate('/worker/login')} 
            style={{ color: '#2563EB', fontWeight: 700, cursor: 'pointer' }}
          >
            Sign In here
          </span>
        </div>
      </div>
    </div>
  );
}
