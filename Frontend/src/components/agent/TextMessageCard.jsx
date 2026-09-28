import React from 'react';
import './AgentCards.css';

export default function TextMessageCard({ data, onAction }) {
  if (!data) return null;

  const { text, suggestions = [], is_choice } = data;
  const showChoiceCards = Boolean(
    is_choice ||
    data?.is_choice ||
    (Array.isArray(suggestions) &&
      suggestions.length > 0 &&
      (suggestions.some((s) => typeof s === 'object' && (s.type === 'find' || s.type === 'community')) ||
       suggestions.some((s) => /community|post/i.test(typeof s === 'object' ? s.text || '' : String(s)))))
  );

  return (
    <div className="agent-choice-wrap">
      {text && (
        <div className="agent-choice-intro">
          {text}
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        showChoiceCards ? (
          <div className="ai-choice-actions-list">
            {suggestions.map((suggestion, idx) => {
              const suggestionText =
                typeof suggestion === 'object' && suggestion !== null
                  ? suggestion.text || suggestion.label || suggestion.prompt || JSON.stringify(suggestion)
                  : String(suggestion);

              const optionType =
                typeof suggestion === 'object' && suggestion !== null && suggestion.type
                  ? suggestion.type
                  : (/community|post/i.test(suggestionText) || idx === 1 ? 'community' : 'find');

              const isCommunity = optionType === 'community';
              const desc = isCommunity
                ? 'Post your service needs to the community'
                : 'Find trusted workers near you';

              return (
                <div
                  key={idx}
                  className="ai-welcome-action-item"
                  onClick={() => onAction && onAction('send_prompt', suggestionText)}
                  title={suggestionText}
                >
                  <div
                    className="ai-welcome-icon-box"
                    style={{
                      backgroundColor: isCommunity ? '#fce7f3' : '#dbeafe',
                      color: isCommunity ? '#e11d48' : '#1d68f0',
                    }}
                  >
                    <md-icon style={{ fontSize: '19px', color: isCommunity ? '#e11d48' : '#1d68f0' }}>
                      {isCommunity ? 'group' : 'search'}
                    </md-icon>
                  </div>
                  <div className="ai-welcome-item-content">
                    <div className="ai-welcome-item-title">{suggestionText}</div>
                    <div className="ai-welcome-item-desc">{desc}</div>
                  </div>
                  <md-icon className="ai-welcome-chevron" style={{ color: '#2563eb' }}>
                    chevron_right
                  </md-icon>
                </div>
              );
            })}
          </div>
        ) : (
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
        )
      )}
    </div>
  );
}
