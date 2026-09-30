import React from 'react';

/**
 * Workio Unified Loading Spinner
 * Matches the sleek, minimalist Community page Uber-spinner aesthetic.
 */
export default function Loader({
  size = 42,
  color,
  darkColor,
  trackColor,
  lightColor,
  borderWidth,
  className = '',
  style = {}
}) {
  const activeColor = color || darkColor || '#000000';
  const activeTrack = trackColor || lightColor || '#eeeeee';
  const calculatedBorder = borderWidth || Math.max(3, Math.round(size / 11));

  return (
    <div
      className={`uber-spinner-ring ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderWidth: `${calculatedBorder}px`,
        borderStyle: 'solid',
        borderColor: activeTrack,
        borderTopColor: activeColor,
        borderRadius: '50%',
        animation: 'uber-spin 0.75s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        boxSizing: 'border-box',
        display: 'inline-block',
        flexShrink: 0,
        ...style
      }}
    >
      <style>
        {`
          @keyframes uber-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
