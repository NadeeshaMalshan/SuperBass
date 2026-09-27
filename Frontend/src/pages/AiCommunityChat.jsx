import React, { useState, useEffect, useRef } from 'react';
import './AiCommunityChat.css';
import '../Community.css';
import UserMenu from '../components/UserMenu.jsx';
import M3TopNavbar from '../components/M3TopNavbar.jsx';
import AgentCardDispatcher from '../components/agent/AgentCardDispatcher.jsx';
import {
  sendAgentMessage,
  checkAgentHealth,
  checkMcpHealth,
  listConversations,
  getConversationMessages,
  deleteConversation,
} from '../services/agentApi.js';

export default function AiCommunityChat() {
  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const currentUserEmail = localStorage.getItem('email') || '';
  const currentUserName = localStorage.getItem('userName') || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Resident');
  const activeRole = localStorage.getItem('activeRole') || 'Resident';

  const getStorageKey = () => {
    const email = (currentUserEmail || '').trim().toLowerCase();
    return email ? `workio_ai_active_conv_${email}` : 'workio_ai_active_conv_guest';
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [conversationId, setConversationId] = useState(() => {
    const email = (localStorage.getItem('email') || '').trim().toLowerCase();
    const key = email ? `workio_ai_active_conv_${email}` : 'workio_ai_active_conv_guest';
    return localStorage.getItem(key) || ('workio-' + Math.random().toString(36).substring(2, 9));
  });
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const getWelcomeMessage = () => ({
    id: 'welcome-' + Date.now(),
    sender: 'assistant',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cardResponse: {
      response_type: 'text_message',
      message: `Hello ${currentUserName}! I am your Workio AI Assistant. I can help you create community posts for home services, search active requests, check your posted notices, or inspect your profile details. How can I help you today?`,
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
  });

  const [messages, setMessages] = useState([getWelcomeMessage()]);
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

  // Synchronize conversation from Neon PostgreSQL on mount
  useEffect(() => {
    let isMounted = true;

    async function syncConversationFromDb() {
      setIsHistoryLoading(true);
      try {
        const storageKey = getStorageKey();
        let targetConvId = localStorage.getItem(storageKey);

        // If no conv ID in localStorage, check if user has existing conversations in DB
        if (!targetConvId && currentUserEmail) {
          const existingConvs = await listConversations(currentUserEmail);
          if (existingConvs && existingConvs.length > 0) {
            targetConvId = existingConvs[0].id;
          }
        }

        if (targetConvId) {
          const dbMsgs = await getConversationMessages(targetConvId);
          if (isMounted) {
            setConversationId(targetConvId);
            localStorage.setItem(storageKey, targetConvId);

            if (dbMsgs && dbMsgs.length > 0) {
              const formatted = dbMsgs.map((m) => {
                const isUser = m.sender === 'user';
                const timeStr = m.created_at
                  ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                if (isUser) {
                  return {
                    id: m.id || 'user-' + Math.random().toString(36).substring(2, 7),
                    sender: 'user',
                    text: m.message,
                    time: timeStr,
                  };
                } else {
                  return {
                    id: m.id || 'asst-' + Math.random().toString(36).substring(2, 7),
                    sender: 'assistant',
                    time: timeStr,
                    cardResponse: {
                      response_type: m.response_type || 'text_message',
                      message: m.message,
                      card_data: m.card_data || {},
                    },
                  };
                }
              });
              setMessages(formatted);
            } else {
              setMessages([getWelcomeMessage()]);
            }
          }
        } else {
          // Fresh conversation session
          const freshId = 'workio-' + Math.random().toString(36).substring(2, 9);
          if (isMounted) {
            setConversationId(freshId);
            localStorage.setItem(storageKey, freshId);
            setMessages([getWelcomeMessage()]);
          }
        }
      } catch (err) {
        console.error('Failed to sync conversation from DB:', err);
        if (isMounted) {
          setMessages([getWelcomeMessage()]);
        }
      } finally {
        if (isMounted) {
          setIsHistoryLoading(false);
        }
      }
    }

    syncConversationFromDb();

    return () => {
      isMounted = false;
    };
  }, [currentUserEmail]);

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

      const effectiveConvId = res.conversation_id || conversationId;
      if (effectiveConvId !== conversationId) {
        setConversationId(effectiveConvId);
      }
      localStorage.setItem(getStorageKey(), effectiveConvId);

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
    } else if (actionType === 'send_prompt' || actionType === 'confirm_post' || actionType === 'cancel_post') {
      handleSendMessage(payload);
    } else if (actionType === 'view_community') {
      navigate(`/community${payload.id ? `?post=${payload.id}` : ''}`);
    } else if (actionType === 'retry') {
      const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
      if (lastUserMsg) {
        handleSendMessage(lastUserMsg.text);
      }
    } else if (typeof actionType === 'string') {
      // Direct prompt string fallback
      handleSendMessage(actionType);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = async () => {
    const oldConvId = conversationId;
    const newConvId = 'workio-' + Math.random().toString(36).substring(2, 9);
    const storageKey = getStorageKey();

    setConversationId(newConvId);
    localStorage.setItem(storageKey, newConvId);
    setMessages([getWelcomeMessage()]);

    // Reset in DB: delete the previous conversation thread so DB is also reset
    if (oldConvId) {
      try {
        await deleteConversation(oldConvId, currentUserEmail);
      } catch (err) {
        console.warn('Could not delete old conversation from DB on reset:', err);
      }
    }
  };

  return (
    <div className="find-page-container ai-chat-uber-page">
      {/* SuperBass Material 3 Top Navbar (Dark Theme matching Landing Page) */}
      <M3TopNavbar
        theme="dark"
        activePage="ai"
        showSidebarToggle={true}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        alwaysShowLinks={true}
      />

      <div className="find-layout ai-chat-uber-layout">
        {/* Left Sidebar — Quick Actions Only */}
        <aside className={`find-sidebar m3-drawer ai-chat-uber-sidebar ${isSidebarCollapsed ? 'minimized' : ''}`}>

          {/* Brand / Identity */}
          <div className="ai-sidebar-brand">
            <div className="ai-sidebar-brand-icon">
              <md-icon style={{ fontSize: '20px', color: '#ffffff' }}>auto_awesome</md-icon>
            </div>
            {!isSidebarCollapsed && (
              <div>
                <div className="ai-sidebar-brand-name">Workio AI</div>
                <div className="ai-sidebar-brand-sub">Community Assistant</div>
              </div>
            )}
          </div>

          {/* New Chat / Reset Button */}
          <button
            type="button"
            className="m3-compose-fab ai-uber-compose-btn"
            onClick={clearChat}
            title="Start a fresh conversation"
          >
            <md-icon>add</md-icon>
            <span>New Chat</span>
          </button>

          {/* Divider */}
          <div className="m3-drawer-divider"></div>

          {/* Quick Actions */}
          {!isSidebarCollapsed && <div className="m3-drawer-section-title" style={{ padding: '0 6px 6px' }}>Quick Actions</div>}
          <nav className="m3-drawer-nav">
            <div className="m3-drawer-item" onClick={() => handleSendMessage('Show recent community posts in Colombo')} title="Recent Posts">
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">campaign</md-icon>
                <span className="m3-drawer-label">Recent Posts</span>
              </div>
            </div>
            <div className="m3-drawer-item" onClick={() => handleSendMessage('Create a community post for home service')} title="Draft a Post">
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">edit_note</md-icon>
                <span className="m3-drawer-label">Draft a Post</span>
              </div>
            </div>
            <div className="m3-drawer-item" onClick={() => handleSendMessage('Find available verified craftsmen near me')} title="Find Craftsmen">
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">handyman</md-icon>
                <span className="m3-drawer-label">Find Craftsmen</span>
              </div>
            </div>
            <div className="m3-drawer-item" onClick={() => handleSendMessage('Show all my community posts')} title="My Posts">
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">person_pin</md-icon>
                <span className="m3-drawer-label">My Posts</span>
              </div>
            </div>
            <div className="m3-drawer-item" onClick={() => handleSendMessage('What is my user role and profile details?')} title="My Profile">
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">manage_accounts</md-icon>
                <span className="m3-drawer-label">My Profile</span>
              </div>
            </div>
          </nav>

          {/* Divider */}
          <div className="m3-drawer-divider"></div>

          {/* Service Shortcuts */}
          {!isSidebarCollapsed && <div className="m3-drawer-section-title" style={{ padding: '0 6px 6px' }}>Emergency Services</div>}
          <nav className="m3-drawer-nav">
            {[
              { label: 'Plumber', icon: 'plumbing', msg: 'Create a community post: Need emergency plumber for leaky pipe in Colombo' },
              { label: 'Electrician', icon: 'electrical_services', msg: 'Create a community post: Need licensed electrician urgently' },
              { label: 'AC Repair', icon: 'air', msg: 'Create a community post: Looking for AC repair technician in Colombo' },
              { label: 'Carpenter', icon: 'carpenter', msg: 'Create a community post: Need experienced carpenter for furniture repair' },
              { label: 'Cleaner', icon: 'cleaning_services', msg: 'Create a community post: Looking for professional home cleaning service' },
            ].map(({ label, icon, msg }) => (
              <div key={label} className="m3-drawer-item" onClick={() => handleSendMessage(msg)} title={label}>
                <div className="m3-drawer-item-left">
                  <md-icon className="m3-drawer-icon">{icon}</md-icon>
                  <span className="m3-drawer-label">{label}</span>
                </div>
              </div>
            ))}
          </nav>

        </aside>

        {/* Main Chat Interface */}
        <main className="find-main ai-chat-main-pane">
          <div className="ai-chat-card-container">
            {/* Header Card */}
            <div className="ai-chat-card-header">
              <div className="ai-chat-title-group">
                <div className="ai-chat-bot-avatar">
                  <md-icon style={{ fontSize: '22px', color: '#ffffff' }}>auto_awesome</md-icon>
                </div>
                <div className="ai-chat-title-text">
                  <h2>Workio AI Assistant</h2>
                  <p>
                    <span className="ai-status-dot online"></span>
                    Workio AI &bull; Community Assistant
                  </p>
                </div>
              </div>

              <div className="ai-chat-status-badges">
                <button className="ai-clear-btn" title="Reset chat" onClick={clearChat}>
                  <md-icon style={{ fontSize: '16px' }}>refresh</md-icon>
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="ai-chat-messages-stream">
              <div className="ai-stream-date-pill">Today &bull; Workio AI Assistant</div>

              {isHistoryLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', gap: '12px', color: '#757575', padding: '2rem' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '24px', color: '#000000' }}></i>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Syncing chat with database...</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`ai-bubble-row ${isUser ? 'resident' : 'assistant'}`}>
                    {!isUser && (
                      <div className="ai-msg-avatar bot-av">
                        <md-icon style={{ fontSize: '18px', color: '#ffffff' }}>auto_awesome</md-icon>
                      </div>
                    )}

                    <div className="ai-msg-wrapper">
                      <div className={`ai-bubble ${isUser ? 'resident' : 'assistant'}`}>
                        {isUser ? (
                          <div>{msg.text}</div>
                        ) : (
                          <AgentCardDispatcher
                            response={msg.cardResponse}
                            onAction={handleCardAction}
                          />
                        )}
                      </div>
                      <span className="ai-msg-time">
                        {msg.time}
                        {isUser && (
                          <i className="fa-solid fa-check-double ai-check-icon"></i>
                        )}
                      </span>
                    </div>
                  </div>
                );
              }))}

              {loading && (
                <div className="ai-bubble-row assistant">
                  <div className="ai-msg-avatar bot-av">
                    <md-icon style={{ fontSize: '18px', color: '#ffffff' }}>auto_awesome</md-icon>
                  </div>
                  <div className="ai-msg-wrapper">
                    <div className="ai-typing-bubble">
                      <span>Community agent is thinking</span>
                      <div className="ai-dots">
                        <span className="ai-dot"></span>
                        <span className="ai-dot"></span>
                        <span className="ai-dot"></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>



            {/* Bottom Input Area */}
            <div className="ai-input-bar-area">
              <div className="ai-pill-input-box">
                <md-icon className="ai-input-sparkle-icon">auto_awesome</md-icon>
                <input
                  ref={inputRef}
                  type="text"
                  className="ai-pill-text-input"
                  placeholder="Ask anything or request to create, search, or update community posts..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
              </div>

              <button
                type="button"
                className={`ai-send-fab-btn ${inputText.trim() ? 'active' : ''}`}
                onClick={() => handleSendMessage()}
                disabled={loading || !inputText.trim()}
                title="Send Message"
              >
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-paper-plane"></i>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
