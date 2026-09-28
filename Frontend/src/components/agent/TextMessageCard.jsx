import React from 'react';
import './AgentCards.css';

export default function TextMessageCard({ data, onAction }) {
  if (!data) return null;

  const { text, suggestions = [], is_choice } = data;

  // Determine if this card is an action choice card
  const isChoice = Boolean(
    is_choice ||
    data?.is_choice ||
    (text && /how would you like to proceed/i.test(text))
  );

  if (isChoice) {
    let introText = '';
    let headingText = 'How would you like to proceed?';

    if (text) {
      const qRegex = /([\s\S]*?)(?:^|\n|\.\s+)(How would you like to proceed\??)([\s\S]*)/i;
      const match = text.match(qRegex);
      if (match) {
        introText = match[1].trim();
        headingText = match[2].trim();
        if (!headingText.endsWith('?')) headingText += '?';
      } else {
        introText = text.trim();
      }
    }

    return (
      <div className="agent-choice-wrap">
        {introText && (
          <div className="agent-choice-intro">
            {introText}
          </div>
        )}

        <div className="agent-choice-heading">
          {headingText}
        </div>

        <div className="agent-choice-cards-container">
          {suggestions.map((suggestion, idx) => {
            const suggestionText =
              typeof suggestion === 'object' && suggestion !== null
                ? suggestion.text || suggestion.label || suggestion.prompt || JSON.stringify(suggestion)
                : String(suggestion);

            // Action type is provided by backend or defaults by option index (1st = find worker, 2nd = community post)
            const optionType =
              typeof suggestion === 'object' && suggestion !== null && suggestion.type
                ? suggestion.type
                : (idx === 1 ? 'community' : 'find');

            const isFind = optionType === 'find' || optionType === 'worker';
            const iconType = optionType === 'community' ? 'community' : 'find';

            return (
              <button
                key={idx}
                type="button"
                className="agent-action-choice-card"
                onClick={() => onAction && onAction('send_prompt', suggestionText)}
              >
                <div className={`agent-choice-icon-box ${iconType}`}>
                  {isFind ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="7"></circle>
                      <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
                    </svg>
                  ) : isCommunity ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#e11d48">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 16 16 12 12 8"></polyline>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                  )}
                </div>
                <span className="agent-choice-label">{suggestionText}</span>
                <div className="agent-choice-chevron">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {text && (
        <div style={{ fontSize: '0.935rem', lineHeight: '1.55', color: '#000000', whiteSpace: 'pre-wrap' }}>
          {text}
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="agent-chips-wrap">
          {suggestions.map((suggestion, idx) => {
            const suggestionText =
              typeof suggestion === 'object' && suggestion !== null
                ? suggestion.text || suggestion.label || suggestion.prompt || JSON.stringify(suggestion)
                : String(suggestion);
            return (
              <button
                key={idx}
                type="button"
                className="agent-chip-btn"
                onClick={() => onAction && onAction('send_prompt', suggestionText)}
              >
                <i className="fa-regular fa-lightbulb"></i>
                {suggestionText}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

