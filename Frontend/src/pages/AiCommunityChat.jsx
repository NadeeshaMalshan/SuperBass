import React, { useState, useEffect, useRef } from 'react';
import './AiCommunityChat.css';
import '../Community.css';
import '../App.css';
import UserMenu from '../components/UserMenu.jsx';
import AgentCardDispatcher from '../components/agent/AgentCardDispatcher.jsx';
import { sendAgentMessage, checkAgentHealth, checkMcpHealth } from '../services/agentApi.js';

export default function AiCommunityChat() {
  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const currentUserEmail = localStorage.getItem('email') || 'resident@superbass.lk';
  const currentUserName = localStorage.getItem('userName') || currentUserEmail.split('@')[0];
  const activeRole = localStorage.getItem('activeRole') || 'Resident';

  const [conversationId, setConversationId] = useState(() => {
    return 'superbass-' + Math.random().toString(36).substring(2, 9);
  });

  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cardResponse: {
        response_type: 'text_message',
        message: `Hello ${currentUserName}! I am your SuperBass AI Assistant. I can help you create community posts for home services, search active requests, check your posted notices, or inspect your profile details. How can I help you today?`,
        card_data: {
          suggestions: [
            'Show recent community posts',
            'Create a post for AC Repair in Colombo',
            'View electrical service posts',
            'Show my active posts',
            'View my profile',
          ],
        },
      },
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentHealth, setAgentHealth] = useState('checking');
  const [mcpHealth, setMcpHealth] = useState('checking');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check backend and MCP server health on mount
  useEffect(() => {
    async function verifyConnections() {
      const [aHealth, mHealth] = await Promise.all([checkAgentHealth(), checkMcpHealth()]);
      setAgentHealth(aHealth.status === 'healthy' ? 'online' : 'offline');
      setMcpHealth(mHealth.status === 'healthy' ? 'online' : 'offline');
    }
    verifyConnections();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || loading) return;

    const userMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: prompt,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const res = await sendAgentMessage({
        message: prompt,
        email: currentUserEmail,
        user_type: activeRole,
        conversation_id: conversationId,
      });

      if (res.conversation_id) {
        setConversationId(res.conversation_id);
      }

      const assistantMessage = {
        id: 'asst-' + Date.now(),
        sender: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cardResponse: res.response || {
          response_type: 'text_message',
          message: 'Received response from assistant.',
          card_data: {},
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Failed to get response:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardResponse: {
            response_type: 'error',
            message: 'Failed to process request. Please ensure the agent backend is running.',
            card_data: {
              errorCode: 'CLIENT_ERROR',
              message: err.message,
              actionRequired: 'Verify agent-backend server on port 8001.',
            },
          },
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCardAction = (actionType, payload) => {
    if (actionType === 'navigate') {
      navigate(payload);
    } else if (actionType === 'send_prompt') {
      handleSendMessage(payload);
    } else if (actionType === 'view_community') {
      navigate(`/community${payload.id ? `?post=${payload.id}` : ''}`);
    } else if (actionType === 'retry') {
      const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
      if (lastUserMsg) {
        handleSendMessage(lastUserMsg.text);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setConversationId('superbass-' + Math.random().toString(36).substring(2, 9));
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cardResponse: {
          response_type: 'text_message',
          message: 'Conversation cleared! How else can I assist you with SuperBass services or community posts?',
          card_data: {
            suggestions: [
              'List recent plumbing requests',
              'Create a post: Looking for House Painter',
              'Who am I? (Check Profile)',
            ],
          },
        },
      },
    ]);
  };

  return (
    <div className="ai-chat-page-wrapper">
      {/* SuperBass Consistent Navbar */}
      <header className="ai-chat-navbar">
        <a
          href="#home"
          className="brand-logo"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          <img src="/iconWithText-cropped.png" alt="Super බාස් Logo" className="brand-logo-img" />
        </a>

        <ul className="nav-links">
          <li className="nav-link" onClick={() => navigate('/find')}>Services</li>
          <li className="nav-link" onClick={() => navigate('/community')}>Community</li>
          <li className="nav-link active" style={{ color: '#FDC101', fontWeight: 700 }} onClick={() => navigate('/ai-chat')}>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '6px' }}></i>
            AI Assistant
          </li>
          <li className="nav-link" onClick={() => navigate('/chats')}>Chats</li>
          <li className="nav-link" onClick={() => navigate('/bookings')}>Bookings</li>
        </ul>

        <div className="nav-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <UserMenu />
        </div>
      </header>

      {/* Main Chat Interface */}
      <main className="ai-chat-main">
        {/* Header Banner Card */}
        <div className="ai-chat-header-card">
          <div className="ai-chat-title-group">
            <div className="ai-chat-bot-icon">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="ai-chat-title-text">
              <h2>SuperBass Community AI Agent</h2>
              <p>Powered by LangGraph & OpenAI gpt-4o-mini &bull; Connected to MCP Tools</p>
            </div>
          </div>

          <div className="ai-chat-status-badges">
            <span className={`ai-status-pill ${agentHealth === 'online' ? 'online' : ''}`}>
              <span className="ai-status-dot" style={{ background: agentHealth === 'online' ? '#22c55e' : '#f59e0b' }}></span>
              Agent :8001
            </span>
            <span className={`ai-status-pill ${mcpHealth === 'online' ? 'online' : ''}`}>
              <span className="ai-status-dot" style={{ background: mcpHealth === 'online' ? '#22c55e' : '#f59e0b' }}></span>
              MCP :8000
            </span>
            <button className="ai-clear-btn" title="Reset chat" onClick={clearChat}>
              <i className="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        {/* Chat Thread Container */}
        <div className="ai-chat-thread-container">
          <div className="ai-chat-messages-area">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message-row ${msg.sender}`}>
                <div className={`ai-msg-avatar ${msg.sender === 'user' ? 'user-av' : 'bot-av'}`}>
                  {msg.sender === 'user' ? (
                    (currentUserName || 'U')[0].toUpperCase()
                  ) : (
                    <i className="fa-solid fa-sparkles"></i>
                  )}
                </div>

                <div className="ai-msg-bubble">
                  {msg.sender === 'user' ? (
                    <div>{msg.text}</div>
                  ) : (
                    <AgentCardDispatcher
                      response={msg.cardResponse}
                      onAction={handleCardAction}
                    />
                  )}
                  <span className="ai-msg-time">{msg.time}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-message-row assistant">
                <div className="ai-msg-avatar bot-av">
                  <i className="fa-solid fa-sparkles"></i>
                </div>
                <div className="ai-typing-indicator">
                  <span>Community agent is working</span>
                  <div className="ai-dots">
                    <span className="ai-dot"></span>
                    <span className="ai-dot"></span>
                    <span className="ai-dot"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips Bar */}
          <div className="ai-suggestions-bar">
            <button
              className="agent-chip-btn"
              onClick={() => handleSendMessage('Show recent community posts in Colombo')}
            >
              <i className="fa-solid fa-bullhorn" style={{ color: '#FDC101' }}></i>
              Recent Posts
            </button>
            <button
              className="agent-chip-btn"
              onClick={() => handleSendMessage('Create a community post: Need emergency plumber for leaky pipe in Colombo')}
            >
              <i className="fa-solid fa-wrench" style={{ color: '#3b82f6' }}></i>
              Post: Plumber Request
            </button>
            <button
              className="agent-chip-btn"
              onClick={() => handleSendMessage('Create a community post: Looking for AC repair technician')}
            >
              <i className="fa-solid fa-snowflake" style={{ color: '#06b6d4' }}></i>
              Post: AC Repair
            </button>
            <button
              className="agent-chip-btn"
              onClick={() => handleSendMessage('Show all my community posts')}
            >
              <i className="fa-solid fa-user-pen" style={{ color: '#8b5cf6' }}></i>
              My Posts
            </button>
            <button
              className="agent-chip-btn"
              onClick={() => handleSendMessage('What is my user role and profile details?')}
            >
              <i className="fa-regular fa-id-badge" style={{ color: '#10b981' }}></i>
              My Profile
            </button>
          </div>

          {/* Input Bar */}
          <div className="ai-chat-input-bar">
            <input
              ref={inputRef}
              type="text"
              className="ai-chat-input"
              placeholder="Ask anything or request to create, search, or update community posts..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="ai-send-btn"
              onClick={() => handleSendMessage()}
              disabled={loading || !inputText.trim()}
              title="Send Message"
            >
              {loading ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-arrow-up"></i>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
