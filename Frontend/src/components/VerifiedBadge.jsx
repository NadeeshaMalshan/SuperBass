import React from 'react';

export default function VerifiedBadge({ size = 18, className = '', style = {}, title = 'Verified Home Craftsman' }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      fill="currentColor" 
      className={`inline-block text-black ${className}`}
      style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
      title={title}
    >
      <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-2.01.02l-2.07-2.37.29-3.13-3.07-.7-1.61-2.72-2.91 1.25L8.72 3.1 7.11 5.82l-3.07.7.29 3.13L2.26 12.02l2.07 2.37-.29 3.13 3.07.7 1.61 2.72 2.91-1.25 2.91 1.25 1.61-2.72 3.07-.7-.29-3.13 2.07-2.37zM10.09 16.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/>
    </svg>
  );
}
// This component renders a verified badge icon using SVG. It accepts props for size, className, style, and title to customize its appearance and accessibility. The default size is 18 pixels, and the default title is "Verified Home Craftsman".