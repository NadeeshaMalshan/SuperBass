import React, { useState } from 'react';
import { validateAndParseNIC } from '../utils/nic-validation.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/icon/icon.js';

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
          <md-icon style={{ fontSize: '48px', width: '48px', height: '48px', color: '#16a34a', marginBottom: '1rem' }}>check_circle</md-icon>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '1.25rem' }}>Account Verified</h3>
          <p style={{ margin: 0, color: '#15803d' }}>Your official identity has been successfully verified.</p>
        </div>
      ) : (
        <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
            <p style={{ margin: '0 0 1.5rem 0', color: '#4b5563' }}>Please enter your official NIC details to verify your account.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <md-filled-text-field
                label="National Identity Card (NIC)"
                type="text"
                value={verifyForm.nic}
                onInput={(e) => setVerifyForm({...verifyForm, nic: e.target.value})}
                required
              ></md-filled-text-field>
              
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
            <md-filled-button
              type="submit"
              style={{ '--md-sys-color-primary': '#2563eb', '--md-sys-color-on-primary': '#ffffff', '--md-filled-button-container-shape': '8px' }}
            >
              Verify Now
            </md-filled-button>
          </div>
        </form>
      )}
    </div>
  );
}
