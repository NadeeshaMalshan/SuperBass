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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-[28px] font-semibold text-black m-0 mb-2 leading-tight">Verify Account</h2>
      
      {isVerified ? (
        <div className="p-10 bg-gray-50 rounded-2xl flex flex-col items-center text-center mt-8">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000" width="64" height="64" className="mb-6">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <h3 className="text-xl font-bold text-black mb-2">Account Verified</h3>
          <p className="text-[15px] text-[#6B6B6B]">Your official identity has been successfully verified.</p>
        </div>
      ) : (
        <form onSubmit={handleVerifySubmit} className="flex flex-col">
          <p className="text-[15px] text-[#6B6B6B] m-0 mb-8">Please enter your official NIC details to verify your account.</p>
          
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-gray-900">National Identity Card (NIC)</label>
              <input
                type="text"
                className="w-full h-12 px-4 bg-white border border-[#D9D9DE] rounded-xl text-[16px] text-black focus:ring-2 focus:ring-black focus:outline-none hover:bg-gray-50 transition-colors"
                value={verifyForm.nic}
                placeholder="e.g., 199912345678"
                onChange={(e) => setVerifyForm({...verifyForm, nic: e.target.value})}
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-gray-900">Date of Birth</label>
              <input 
                type="date"
                className="w-full h-12 px-4 bg-white border border-[#D9D9DE] rounded-xl text-[16px] text-black focus:ring-2 focus:ring-black focus:outline-none hover:bg-gray-50 transition-colors"
                value={verifyForm.dob}
                onChange={(e) => setVerifyForm({...verifyForm, dob: e.target.value})}
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-gray-900">Gender</label>
              <select 
                className="w-full h-12 px-4 bg-white border border-[#D9D9DE] rounded-xl text-[16px] text-black focus:ring-2 focus:ring-black focus:outline-none hover:bg-gray-50 transition-colors appearance-none bg-no-repeat bg-[right_16px_center] bg-[length:16px_16px]"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")` }}
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
            <div className="mt-5 p-4 bg-red-50 text-red-600 rounded-xl text-[14px] font-medium border border-red-100">
              {verifyError}
            </div>
          )}

          <div className="mt-8">
            <button
              type="submit"
              className="w-full sm:w-auto h-12 px-6 font-semibold text-white bg-black rounded-xl hover:bg-[#222222] transition-colors border-none outline-none cursor-pointer text-[16px] whitespace-nowrap disabled:opacity-40"
            >
              Verify Now
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
