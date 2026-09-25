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
  createConversation,
  getConversationMessages,
  deleteConversation,
} from '../services/agentApi.js';

export default function AiCommunityChat() {
  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const currentUserEmail = localStorage.getItem('email') || 'resident@superbass.lk';
  const currentUserName = localStorage.getItem('userName') || currentUserEmail.split('@')[0];
  const activeRole = localStorage.getItem('activeRole') || 'Resident';

  const [conversations, setConversations] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversationId, setConversationId] = useState(() => {
    return 'superbass-' + Math.random().toString(36).substring(2, 9);
  });

  const getWelcomeMessage = () => ({
    id: 'welcome-' + Date.now(),
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
  });

  const [messages, setMessages] = useState([getWelcomeMessage()]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentHealth, setAgentHealth] = useState('checking');
  const [mcpHealth, setMcpHealth] = useState('checking');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check backend and MCP server health on mount & load conversations
  useEffect(() => {
    async function verifyConnections() {
      const [aHealth, mHealth] = await Promise.all([checkAgentHealth(), checkMcpHealth()]);
      setAgentHealth(aHealth.status === 'healthy' ? 'online' : 'offline');
      setMcpHealth(mHealth.status === 'healthy' ? 'online' : 'offline');
    }
    verifyConnections();
    loadUserConversations();
  }, []);

  const loadUserConversations = async () => {
    try {
      const convs = await listConversations(currentUserEmail);
      setConversations(convs);
      if (convs && convs.length > 0) {
        // Automatically select the most recent conversation
        handleSelectConversation(convs[0].id, convs);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const handleSelectConversation = async (convId, existingList) => {
    setConversationId(convId);
    setLoading(true);
    try {
      const dbMsgs = await getConversationMessages(convId);
      if (dbMsgs && dbMsgs.length > 0) {
        const mapped = dbMsgs.map((m) => {
          const isUser = m.role === 'user';
          const time = m.created_at
            ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          if (isUser) {
            return {
              id: m.id,
              sender: 'user',
              text: m.content,
              time,
            };
          } else {
            return {
              id: m.id,
              sender: 'assistant',
              time,
              cardResponse: {
                response_type: m.response_type || 'text_message',
                message: m.content,
                card_data: m.card_data || {},
              },
            };
          }
        });
        setMessages(mapped);
      } else {
        setMessages([getWelcomeMessage()]);
      }
    } catch (err) {
      console.error(`Failed to load messages for ${convId}:`, err);
      setMessages([getWelcomeMessage()]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    const newConvId = 'superbass-' + Math.random().toString(36).substring(2, 9);
    try {
      const created = await createConversation(currentUserEmail, 'New Conversation');
      const convIdToUse = created?.id || newConvId;
      setConversationId(convIdToUse);
      setMessages([getWelcomeMessage()]);
      const convs = await listConversations(currentUserEmail);
      setConversations(convs);
    } catch (e) {
      setConversationId(newConvId);
      setMessages([getWelcomeMessage()]);
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await deleteConversation(convId, currentUserEmail);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (conversationId === convId) {
        if (remaining.length > 0) {
          handleSelectConversation(remaining[0].id, remaining);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

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

      if (res.conversation_id && res.conversation_id !== conversationId) {
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

      // Refresh sidebar conversations to update titles and order
      const convs = await listConversations(currentUserEmail);
      setConversations(convs);
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
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    handleNewChat();
  };

  const filteredConversations = conversations.filter((c) =>
    (c.title || 'New Conversation').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="find-page-container">
      {/* SuperBass Material 3 Top Navbar */}
      <M3TopNavbar
        activePage="ai"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search conversations or ask SuperBass AI..."
        showSidebarToggle={true}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <div className="find-layout">
        {/* Left Material 3 Drawer Sidebar */}
        <aside className={`find-sidebar m3-drawer ${isSidebarCollapsed ? 'minimized' : ''}`}>
          {/* New Chat Extended FAB */}
          <button
            type="button"
            className="m3-compose-fab"
            onClick={handleNewChat}
            title="Start New AI Conversation"
          >
            <md-icon>add</md-icon>
            <span>New Chat</span>
          </button>

          {/* Quick Assistant Capabilities / Modes */}
          <nav className="m3-drawer-nav">
            <div
              className="m3-drawer-item active"
              onClick={() => {}}
              title="SuperBass Community AI"
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon" style={{ color: '#d97706' }}>smart_toy</md-icon>
                <span className="m3-drawer-label">AI Assistant</span>
              </div>
            </div>

            <div
              className="m3-drawer-item"
              onClick={() => handleSendMessage('Create a community post for home service')}
              title="Ask AI to draft a community post"
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">edit_note</md-icon>
                <span className="m3-drawer-label">Draft Post</span>
              </div>
            </div>

            <div
              className="m3-drawer-item"
              onClick={() => handleSendMessage('Find available verified craftsmen near me')}
              title="Ask AI to find verified workers"
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">handyman</md-icon>
                <span className="m3-drawer-label">Find Craftsmen</span>
              </div>
            </div>
          </nav>

          {/* Section Divider */}
          <div className="m3-drawer-divider" style={{ margin: '14px 0 8px', borderBottom: '1px solid #e8edf3' }}></div>

          {/* Section Header */}
          <div
            className="m3-drawer-section-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 8px 8px 12px',
            }}
          >
            <span
              className="m3-drawer-section-title"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Conversations
            </span>
            <span
              className="m3-drawer-badge"
              style={{
                background: '#f1f5f9',
                color: '#64748b',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {conversations.length}
            </span>
          </div>

          {/* Conversations Threads List */}
          <div className="m3-drawer-nav" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1.25rem 0.5rem' }}>
                {searchQuery ? 'No matching chats' : 'No previous chats'}
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === conversationId;
                return (
                  <div
                    key={c.id}
                    className={`m3-drawer-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectConversation(c.id, conversations)}
                    style={{ position: 'relative', paddingRight: '36px' }}
                    title={c.title || 'Conversation'}
                  >
                    <div className="m3-drawer-item-left" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <md-icon className="m3-drawer-icon" style={{ fontSize: '18px', color: isActive ? '#b45309' : '#64748b' }}>
                        {isActive ? 'chat' : 'chat_bubble_outline'}
                      </md-icon>
                      <span
                        className="m3-drawer-label"
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '0.84rem',
                        }}
                      >
                        {c.title || 'New Conversation'}
                      </span>
                    </div>
                    <button
                      type="button"
                      title="Delete chat"
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <md-icon style={{ fontSize: '16px' }}>delete</md-icon>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Chat Interface */}
        <main className="find-main ai-chat-main-pane">
          <div className="ai-chat-card-container">
            {/* Header Card */}
            <div className="ai-chat-card-header">
              <div className="ai-chat-title-group">
                <div className="ai-chat-bot-avatar">
                  <i className="fa-solid fa-robot"></i>
                </div>
                <div className="ai-chat-title-text">
                  <h2>SuperBass AI Assistant</h2>
                  <p>
                    <span className="ai-status-dot" style={{ display: 'inline-block' }}></span>
                    LangGraph &bull; OpenAI &bull; MCP Tools Online
                  </p>
                </div>
              </div>

              <div className="ai-chat-status-badges">
                <span className={`ai-status-pill ${agentHealth === 'online' ? 'online' : ''}`}>
                  <span className="ai-status-dot" style={{ background: agentHealth === 'online' ? '#22c55e' : '#f59e0b' }}></span>
                  Agent
                </span>
                <span className={`ai-status-pill ${mcpHealth === 'online' ? 'online' : ''}`}>
                  <span className="ai-status-dot" style={{ background: mcpHealth === 'online' ? '#22c55e' : '#f59e0b' }}></span>
                  MCP
                </span>
                <button className="ai-clear-btn" title="Reset chat" onClick={clearChat}>
                  <md-icon style={{ fontSize: '16px' }}>refresh</md-icon>
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="ai-chat-messages-stream">
              <div className="ai-stream-date-pill">Today &bull; SuperBass AI Assistant</div>

              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`ai-bubble-row ${isUser ? 'resident' : 'assistant'}`}>
                    {!isUser && (
                      <div className="ai-msg-avatar bot-av">
                        <i className="fa-solid fa-sparkles"></i>
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
                          <i className="fa-solid fa-check-double" style={{ fontSize: '0.7rem', color: '#0284c7' }}></i>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="ai-bubble-row assistant">
                  <div className="ai-msg-avatar bot-av">
                    <i className="fa-solid fa-sparkles"></i>
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

            {/* Quick Suggestions Chips Bar */}
            <div className="ai-suggestions-bar">
              <button
                type="button"
                className="agent-chip-btn"
                onClick={() => handleSendMessage('Show recent community posts in Colombo')}
              >
                <i className="fa-solid fa-bullhorn" style={{ color: '#d97706' }}></i>
                Recent Posts
              </button>
              <button
                type="button"
                className="agent-chip-btn"
                onClick={() => handleSendMessage('Create a community post: Need emergency plumber for leaky pipe in Colombo')}
              >
                <i className="fa-solid fa-wrench" style={{ color: '#2563eb' }}></i>
                Plumber Request
              </button>
              <button
                type="button"
                className="agent-chip-btn"
                onClick={() => handleSendMessage('Create a community post: Looking for AC repair technician')}
              >
                <i className="fa-solid fa-snowflake" style={{ color: '#0284c7' }}></i>
                AC Repair
              </button>
              <button
                type="button"
                className="agent-chip-btn"
                onClick={() => handleSendMessage('Show all my community posts')}
              >
                <i className="fa-solid fa-user-pen" style={{ color: '#7c3aed' }}></i>
                My Posts
              </button>
              <button
                type="button"
                className="agent-chip-btn"
                onClick={() => handleSendMessage('What is my user role and profile details?')}
              >
                <i className="fa-regular fa-id-badge" style={{ color: '#16a34a' }}></i>
                My Profile
              </button>
            </div>

            {/* Bottom Input Area */}
            <div className="ai-input-bar-area">
              <div className="ai-pill-input-box">
                <md-icon style={{ color: '#d97706', fontSize: '20px' }}>auto_awesome</md-icon>
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
