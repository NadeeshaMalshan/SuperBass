import React from 'react';

// Progress block
export function StepProgress({ currentStep, totalSteps = 4 }) {
  const segments = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '32px' }}>
      <div style={{
        fontSize: '13px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: '#5C5C5C',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        Step {currentStep} of {totalSteps}
      </div>
      <div 
        style={{ display: 'flex', gap: '8px', width: '100%' }}
        aria-label={`Step ${currentStep} of ${totalSteps}`}
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      >
        {segments.map((step) => (
          <div
            key={step}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '999px',
              backgroundColor: step <= currentStep ? '#000000' : '#E2E2E2',
              transition: 'background-color 0.3s ease'
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Heading block
export function StepHeading({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '32px', textAlign: 'center' }}>
      <h1 style={{
        fontSize: 'clamp(36px, 8vw, 52px)',
        lineHeight: 1.04,
        fontWeight: '700',
        letterSpacing: '-0.035em',
        color: '#000000',
        margin: '0 0 16px 0'
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          fontSize: '18px',
          lineHeight: 1.5,
          color: '#5C5C5C',
          margin: 0
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// Input component
export function TextField({ label, errorText, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {label && (
        <label style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#000000'
        }}>
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%',
          height: '60px',
          borderRadius: '16px',
          padding: '0 20px',
          fontSize: '18px',
          backgroundColor: '#ffffff',
          border: `1.5px solid ${errorText ? '#D92D20' : '#D4D4D4'}`,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s ease',
          fontFamily: 'inherit'
        }}
        onFocus={(e) => {
          if (!errorText) e.target.style.border = '2px solid #000000';
        }}
        onBlur={(e) => {
          if (!errorText) e.target.style.border = '1.5px solid #D4D4D4';
        }}
        {...props}
      />
      {errorText && (
        <span style={{ fontSize: '14px', color: '#D92D20' }}>
          {errorText}
        </span>
      )}
    </div>
  );
}

// Select component
export function SelectField({ label, options, placeholder, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {label && (
        <label style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#000000'
        }}>
          {label}
        </label>
      )}
      <select
        style={{
          width: '100%',
          height: '60px',
          borderRadius: '16px',
          padding: '0 20px',
          fontSize: '18px',
          backgroundColor: '#ffffff',
          border: '1.5px solid #D4D4D4',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s ease',
          fontFamily: 'inherit',
          appearance: 'none',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%235C5C5C\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 20px center',
          backgroundSize: '20px'
        }}
        onFocus={(e) => e.target.style.border = '2px solid #000000'}
        onBlur={(e) => e.target.style.border = '1.5px solid #D4D4D4'}
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// Primary button
export function PrimaryButton({ label, onClick, disabled, isLastStep, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height: '60px',
        borderRadius: '999px',
        backgroundColor: disabled ? '#BDBDBD' : '#000000',
        color: '#ffffff',
        fontSize: '17px',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        pointerEvents: disabled ? 'none' : 'auto'
      }}
      onMouseOver={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = '#1F1F1F'; }}
      onMouseOut={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = '#000000'; }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.99)'; }}
      onMouseUp={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {label}
      {!isLastStep && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14"></path>
          <path d="M12 5l7 7-7 7"></path>
        </svg>
      )}
    </button>
  );
}

// Secondary Link Action
export function SecondaryLink({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        fontSize: '15px',
        fontWeight: '500',
        color: '#5C5C5C',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'color 0.2s ease'
      }}
      onMouseOver={(e) => e.currentTarget.style.color = '#000000'}
      onMouseOut={(e) => e.currentTarget.style.color = '#5C5C5C'}
    >
      {label}
    </button>
  );
}
