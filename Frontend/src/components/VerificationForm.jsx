import React, { useState } from 'react';
import { validateAndParseNIC } from '../utils/nic-validation.js';

export default function VerificationForm({ isVerified, onVerifySuccess }) {
  const [verifyForm, setVerifyForm] = useState({
    nic: '',
    dob: '',
    gender: 'Male'
  });
  const [verifyError, setVerifyError] = useState('');

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    setVerifyError('');
    const result = validateAndParseNIC(verifyForm.nic);
    if (!result.isValid) {
      setVerifyError('Verification failed: The entered details do not match the official NIC records.');
      return;
    }
    
    if (result.data.dateOfBirth !== verifyForm.dob || result.data.gender.toLowerCase() !== verifyForm.gender.toLowerCase()) {
      setVerifyError('Verification failed: The entered details do not match the official NIC records.');
      return;
    }

    if (onVerifySuccess) {
      onVerifySuccess();
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: 0, marginBottom: '1.5rem', color: '#111827' }}>Verify Account</h2>
      
      {isVerified ? (
        <div style={{ padding: '2rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#16a34a" width="48" height="48" style={{ marginBottom: '1rem' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '1.25rem' }}>Account Verified</h3>
          <p style={{ margin: 0, color: '#15803d' }}>Your official identity has been successfully verified.</p>
        </div>
      ) : (
        <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
            <p style={{ margin: '0 0 1.5rem 0', color: '#4b5563' }}>Please enter your official NIC details to verify your account.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: '#4b5563', paddingLeft: '16px' }}>National Identity Card (NIC)</label>
                <input
                  type="text"
                  style={{
                    padding: '16px',
                    border: 'none',
                    borderBottom: '1px solid #111827',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px 4px 0 0',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  value={verifyForm.nic}
                  onChange={(e) => setVerifyForm({...verifyForm, nic: e.target.value})}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: '#4b5563', paddingLeft: '16px' }}>Date of Birth</label>
                <input 
                  type="date"
                  style={{
                    padding: '16px',
                    border: 'none',
                    borderBottom: '1px solid #111827',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px 4px 0 0',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  value={verifyForm.dob}
                  onChange={(e) => setVerifyForm({...verifyForm, dob: e.target.value})}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: '#4b5563', paddingLeft: '16px' }}>Gender</label>
                <select 
                  style={{
                    padding: '16px',
                    border: 'none',
                    borderBottom: '1px solid #111827',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px 4px 0 0',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  value={verifyForm.gender}
                  onChange={(e) => setVerifyForm({...verifyForm, gender: e.target.value})}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {verifyError && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '0.9rem' }}>
                {verifyError}
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Verify Now
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
