import React, { useState } from 'react';

export default function ChatModal({ isOpen, onClose, recipient, postContext }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: 'me',
        text: inputText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInputText('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="detail-modal-box" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', height: '580px', padding: 0 }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', color: '#ffffff', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src={recipient?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'} 
              alt={recipient?.name || 'User'} 
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #38bdf8' }}
            />
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>{recipient?.name || 'SuperBass Member'}</div>
              {postContext?.title && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>
                  Re: {postContext.title}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Message Body */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto', fontSize: '0.9rem' }}>
              <i className="fa-solid fa-comments" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block' }}></i>
              Start conversation with {recipient?.name || 'this member'}
            </div>
          ) : (
            messages.map(msg => (
              <div 
                key={msg.id} 
                style={{ 
                  alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.sender === 'me' ? '#0284c7' : '#ffffff',
                  color: msg.sender === 'me' ? '#ffffff' : '#0f172a',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  maxWidth: '80%',
                  fontSize: '0.9rem',
                  border: msg.sender === 'me' ? 'none' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div>{msg.text}</div>
                <div style={{ fontSize: '0.7rem', color: msg.sender === 'me' ? '#e0f2fe' : '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                  {msg.timestamp}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', gap: '8px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
          />
          <button 
            type="submit" 
            style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '20px', padding: '0 20px', fontWeight: '700', cursor: 'pointer' }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
