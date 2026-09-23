import React, { useState, useRef, useEffect } from 'react';
import './AiAssistantWidget.css';
import AgentCardDispatcher from './agent/AgentCardDispatcher.jsx';
import { sendAgentMessage } from '../services/agentApi.js';

export default function AiAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'widget-welcome',
      sender: 'assistant',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cardResponse: {
        response_type: 'text_message',
        message: 'Hi there! I am your SuperBass AI Assistant. Need help creating a community post or searching for services?',
        card_data: {
          suggestions: [
            'Create AC repair post',
            'Find plumber requests',
            'Show my posts',
          ],
        },
      },
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId] = useState(() => 'widget-' + Math.random().toString(36).substring(2, 8));
  const bodyRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  const handleSend = async (textToSend) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || loading) return;

    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: prompt,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await sendAgentMessage({
        message: prompt,
        conversation_id: convId,
      });

      const asstMsg = {
        id: 'asst-' + Date.now(),
        sender: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cardResponse: res.response || {
          response_type: 'text_message',
          message: 'Response received.',
          card_data: {},
        },
      };

      setMessages((prev) => [...prev, asstMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardResponse: {
            response_type: 'error',
            message: 'Failed to reach agent-backend server.',
            card_data: { message: err.message },
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (actionType, payload) => {
    if (actionType === 'navigate') {
      window.history.pushState({}, '', payload);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (actionType === 'send_prompt') {
      handleSend(payload);
    } else if (actionType === 'view_community') {
      window.history.pushState({}, '', `/community${payload.id ? `?post=${payload.id}` : ''}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const openFullScreen = () => {
    setIsOpen(false);
    window.history.pushState({}, '', '/ai-chat');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className="ai-fab-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Chat with SuperBass AI"
      >
        <span className="ai-fab-pulse"></span>
        <i className="fa-solid fa-wand-magic-sparkles"></i>
        <span>SuperBass AI</span>
      </button>

      {/* Floating Chat Popover */}
      {isOpen && (
        <div className="ai-popover-backdrop">
          <div className="ai-popover-header">
            <div className="ai-popover-header-title">
              <i className="fa-solid fa-robot" style={{ color: '#b45309', fontSize: '1.1rem' }}></i>
              <div>
                <h4>SuperBass AI</h4>
                <span>LangGraph & Community Agent</span>
              </div>
            </div>

            <div className="ai-popover-controls">
              <button
                className="ai-popover-btn"
                title="Open in full page"
                onClick={openFullScreen}
              >
                <i className="fa-solid fa-expand"></i>
              </button>
              <button
                className="ai-popover-btn"
                title="Close"
                onClick={() => setIsOpen(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <div className="ai-popover-body" ref={bodyRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    background: m.sender === 'user' ? '#FDC101' : '#ffffff',
                    color: '#0f172a',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    fontSize: '0.885rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {m.sender === 'user' ? (
                    m.text
                  ) : (
                    <AgentCardDispatcher
                      response={m.cardResponse}
                      onAction={handleAction}
                    />
                  )}
                </div>
                <span style={{ fontSize: '0.685rem', color: '#94a3b8', alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.time}
                </span>
              </div>
            ))}

            {loading && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#FDC101' }}></i>
                Agent thinking...
              </div>
            )}
          </div>

          <div className="ai-popover-footer">
            <input
              type="text"
              className="ai-popover-input"
              placeholder="Ask anything or create a post..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              disabled={loading}
            />
            <button
              className="ai-popover-send"
              onClick={() => handleSend()}
              disabled={loading || !inputText.trim()}
            >
              <i className="fa-solid fa-arrow-up"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
