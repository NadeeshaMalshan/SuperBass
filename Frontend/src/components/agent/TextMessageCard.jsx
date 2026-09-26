import React from 'react';
import './AgentCards.css';

export default function TextMessageCard({ data, onAction }) {
  if (!data) return null;

  const { text, suggestions = [] } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {text && (
        <div style={{ fontSize: '0.935rem', lineHeight: '1.55', color: '#000000', whiteSpace: 'pre-wrap' }}>
          {text}
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="agent-chips-wrap">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              className="agent-chip-btn"
              onClick={() => onAction && onAction('send_prompt', suggestion)}
            >
              <i className="fa-regular fa-lightbulb"></i>
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
