import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Chats.css';
import UserMenu from './components/UserMenu.jsx';

const API_BASE_URL = 'http://localhost:5237/api/conversations';

const EMOJI_CATEGORIES = {
  smileys: [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪',
    '🤗', '🤔', '🤐', '🤨', '😐', '😏', '😒', '🙄', '😬', '😴',
    '👍', '👎', '👌', '✌️', '🤞', '🤝', '🙏', '👏', '🙌', '💪'
  ],
  tools: [
    '🔧', '🔨', '🪛', '🪚', '🧰', '🔩', '⚙️', '🪜', '🚰', '🚿',
    '💡', '🔌', '🔋', '🚪', '🔑', '🧹', '🧺', '🧽', '🧯', '📦',
    '🏠', '🏡', '🏢', '🏗️', '🚗', '🚚', '🛵', '🕒', '📅', '💰'
  ],
  reactions: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '✨', '⭐', '🔥', '🎉',
    '💯', '🎊', '🏆', '🎯', '☀️', '🌧️', '⚡', '🌈', '✅', '❌'
  ]
};

export default function Chats() {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState('smileys');

  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  const currentUserEmail = localStorage.getItem('email') || 'resident@superbass.lk';
  const token = localStorage.getItem('token');

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, showEmojiPicker]);

  // Fetch all user conversations
  const fetchConversations = async () => {
    try {
      const res = await axios.get(API_BASE_URL, {
        params: { userEmail: currentUserEmail },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && Array.isArray(res.data)) {
        setConversations(res.data);
        // If no chat selected, select the first one by default
        if (!selectedChat && res.data.length > 0) {
          setSelectedChat(res.data[0]);
          loadMessages(res.data[0].id);
        }
      }
    } catch (err) {
      console.warn('Error loading conversations:', err.message);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [currentUserEmail]);

  // Load messages for selected chat
  const loadMessages = async (conversationId) => {
    if (!conversationId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/${conversationId}/messages`, {
        params: { userEmail: currentUserEmail, page: 1, pageSize: 60 },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && Array.isArray(res.data)) {
        setMessages(res.data);
      }

      // Mark conversation as read
      try {
        await axios.post(`${API_BASE_URL}/${conversationId}/read`, { readerEmail: currentUserEmail }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch (e) {}
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      const msgInterval = setInterval(() => loadMessages(selectedChat.id), 3500);
      return () => clearInterval(msgInterval);
    }
  }, [selectedChat]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (selectedChat) {
      try {
        axios.post(`${API_BASE_URL}/${selectedChat.id}/typing`, {
          userEmail: currentUserEmail,
          isTyping: true
        });
      } catch (err) {}
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedChat(conv);
    setShowEmojiPicker(false);
    loadMessages(conv.id);
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text && !previewImage) return;
    if (!selectedChat) return;

    setIsSending(true);
    setShowEmojiPicker(false);

    const newMsg = {
      id: `local-${Date.now()}`,
      conversationId: selectedChat.id,
      senderEmail: currentUserEmail,
      senderRole: 'Resident',
      messageType: previewImage ? 'Image' : 'Text',
      content: text || (previewImage ? 'Shared an image' : ''),
      attachmentUrl: previewImage,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    const clearImg = previewImage;
    try {
      const isUserWorker = selectedChat.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase();
      const targetReceiverEmail = isUserWorker ? selectedChat.residentEmail : selectedChat.workerEmail;
      const targetReceiverRole = isUserWorker ? 'Resident' : 'Worker';

      await axios.post(
        `${API_BASE_URL}/${selectedChat.id}/messages`,
        {
          senderEmail: currentUserEmail,
          senderRole: isUserWorker ? 'Worker' : 'Resident',
          receiverEmail: targetReceiverEmail,
          receiverRole: targetReceiverRole,
          messageType: newMsg.messageType,
          content: newMsg.content,
          attachmentUrl: clearImg
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emoji) => {
    setInputText(prev => prev + emoji);
    textInputRef.current?.focus();
  };

  const getInitial = (name) => {
    if (!name) return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatConversationTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter conversations by search term
  const filteredConversations = conversations.filter(c => {
    const term = searchTerm.toLowerCase();
    const otherName = (c.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase() ? c.residentName : c.workerName) || '';
    const lastMsg = c.lastMessage || '';
    return otherName.toLowerCase().includes(term) || lastMsg.toLowerCase().includes(term);
  });

  const hasContentToSend = inputText.trim().length > 0 || previewImage !== null;

  return (
    <div className="chats-page-container">
      {/* App Header Navbar */}
      <header className="chats-navbar">
        <div className="chats-nav-left">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="chats-brand-logo">
            <img src="/iconWithText-cropped.png" alt="Super Bass Logo" />
          </a>
          <ul className="chats-nav-links">
            <li className="chats-nav-link" onClick={() => navigate('/')}>Home</li>
            <li className="chats-nav-link" onClick={() => navigate('/find')}>Find Workers</li>
            <li className="chats-nav-link" onClick={() => navigate('/community')}>Community</li>
            <li className="chats-nav-link active" style={{ color: '#00d26a', fontWeight: 600 }}>Messages</li>
          </ul>
        </div>

        <div className="chats-nav-right">
          <UserMenu />
        </div>
      </header>

      {/* Messenger Body */}
      <div className="chats-body">
        {/* Left Sidebar */}
        <aside className="chats-sidebar">
          <div className="chats-sidebar-header">
            <h2>Messages</h2>
          </div>

          <div className="chats-search-wrapper">
            <div className="chats-search-input-box">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="chats-conversations-list">
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                <i className="fa-regular fa-comment-dots" style={{ fontSize: '2rem', marginBottom: '10px', color: '#cbd5e1' }}></i>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No conversations found</p>
                <button
                  onClick={() => navigate('/community')}
                  style={{
                    marginTop: '12px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '16px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Browse Community
                </button>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isUserWorker = conv.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase();
                const otherName = (isUserWorker ? conv.residentName : conv.workerName) || 'SuperBass Member';
                const otherAvatar = isUserWorker ? null : conv.workerProfileImage;
                const isSelected = selectedChat?.id === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={`chat-item-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <div className="chat-item-avatar-wrapper">
                      {otherAvatar ? (
                        <img src={otherAvatar} alt="avatar" className="chat-item-avatar" />
                      ) : (
                        <div className="chat-item-avatar">{getInitial(otherName)}</div>
                      )}
                      <span className="chat-item-online"></span>
                    </div>

                    <div className="chat-item-content">
                      <div className="chat-item-top">
                        <span className="chat-item-name">{otherName}</span>
                        <span className="chat-item-time">{formatConversationTime(conv.lastMessageAt || conv.updatedAt)}</span>
                      </div>
                      <div className="chat-item-bottom">
                        <span className="chat-item-preview">{conv.lastMessage || 'No messages yet'}</span>
                        {conv.unreadCount > 0 && (
                          <span className="chat-item-badge">{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Active Chat Pane */}
        {selectedChat ? (
          <main className="chats-main-pane">
            {/* Header */}
            <div className="chats-main-header">
              <div className="chats-header-user-info">
                {selectedChat.workerProfileImage ? (
                  <img src={selectedChat.workerProfileImage} alt="avatar" className="chats-header-avatar" />
                ) : (
                  <div className="chats-header-avatar">
                    {getInitial(selectedChat.workerName || 'Worker')}
                  </div>
                )}
                <div>
                  <h3 className="chats-header-name">{selectedChat.workerName || 'Jayashan Manodya'}</h3>
                  <span className="chats-header-status">
                    <i className="fa-solid fa-circle" style={{ fontSize: '0.5rem' }}></i> Active now
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="chats-pill-icon-btn"
                  title="Call"
                  onClick={() => alert(`Calling ${selectedChat.workerName}...`)}
                >
                  <i className="fa-solid fa-phone"></i>
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="chats-messages-stream" onClick={() => setShowEmojiPicker(false)}>
              <div className="chats-stream-date">Today</div>

              {messages.map((msg, idx) => {
                const isResident = msg.senderRole === 'Resident' || 
                  (msg.senderEmail?.toLowerCase() === currentUserEmail.toLowerCase() && msg.senderRole !== 'Worker');

                return (
                  <div
                    key={msg.id || idx}
                    className={`chats-bubble-row ${isResident ? 'resident' : 'worker'}`}
                  >
                    {!isResident && (
                      <div className="chats-msg-avatar">
                        {getInitial(selectedChat.workerName || 'W')}
                      </div>
                    )}

                    <div className="chats-msg-wrapper">
                      <div className={`chats-bubble ${isResident ? 'resident' : 'worker'}`}>
                        {msg.content && <div>{msg.content}</div>}
                        {msg.attachmentUrl && (
                          <img
                            src={msg.attachmentUrl}
                            alt="attachment"
                            style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '12px', marginTop: '6px', objectFit: 'cover' }}
                            onClick={() => window.open(msg.attachmentUrl, '_blank')}
                          />
                        )}
                      </div>
                      <span className="chats-msg-time">
                        {formatMessageTime(msg.createdAt)}
                        {isResident && (
                          msg.id && msg.id.toString().startsWith('local-') ? (
                            <i className="fa-solid fa-check" title="Sent" style={{ fontSize: '0.7rem', color: '#94a3b8' }}></i>
                          ) : msg.isRead ? (
                            <i className="fa-solid fa-check-double" title="Read" style={{ fontSize: '0.7rem', color: '#0284c7' }}></i>
                          ) : (
                            <i className="fa-solid fa-check-double" title="Delivered" style={{ fontSize: '0.7rem', color: '#94a3b8' }}></i>
                          )
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="chats-bubble-row worker">
                  <div className="chats-msg-avatar">
                    {getInitial(selectedChat.workerName || 'W')}
                  </div>
                  <div className="chats-typing-bubble">
                    <span className="chats-typing-dot"></span>
                    <span className="chats-typing-dot"></span>
                    <span className="chats-typing-dot"></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview Bar if attached */}
            {previewImage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 20px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
                <img src={previewImage} alt="preview" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                <span style={{ fontSize: '0.85rem', color: '#475569', flex: 1 }}>Photo ready to send</span>
                <button
                  onClick={() => setPreviewImage(null)}
                  style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '10px 18px', height: '200px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => setEmojiCategory('smileys')}
                    style={{ background: emojiCategory === 'smileys' ? '#e0f2fe' : 'none', border: 'none', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    😊
                  </button>
                  <button
                    onClick={() => setEmojiCategory('tools')}
                    style={{ background: emojiCategory === 'tools' ? '#e0f2fe' : 'none', border: 'none', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    🔧
                  </button>
                  <button
                    onClick={() => setEmojiCategory('reactions')}
                    style={{ background: emojiCategory === 'reactions' ? '#e0f2fe' : 'none', border: 'none', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    ✨
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px', paddingTop: '8px' }}>
                  {EMOJI_CATEGORIES[emojiCategory].map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => handleEmojiClick(emoji)}
                      style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', borderRadius: '6px', padding: '4px' }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Input Area */}
            <div className="chats-input-bar-area">
              <div className="chats-pill-input">
                <input
                  type="text"
                  ref={textInputRef}
                  className="chats-pill-text-input"
                  placeholder="Chat message..."
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                />

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleImageSelected}
                />

                <button
                  type="button"
                  className="chats-pill-icon-btn"
                  title="Emoji"
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                >
                  <i className="fa-regular fa-face-smile"></i>
                </button>

                <button
                  type="button"
                  className="chats-pill-icon-btn"
                  title="Attach photo"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fa-regular fa-image"></i>
                </button>
              </div>

              <button
                type="button"
                className={`chats-send-fab-btn ${hasContentToSend ? 'active' : ''}`}
                onClick={handleSendMessage}
                disabled={!hasContentToSend || isSending}
                title="Send"
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </main>
        ) : (
          <div className="chats-empty-state">
            <div className="chats-empty-illustration">
              <i className="fa-regular fa-comments"></i>
            </div>
            <h3>SuperBass Messages</h3>
            <p>Send and receive messages directly with verified home service professionals and community residents.</p>
            <button className="chats-empty-btn" onClick={() => navigate('/find')}>
              Find Workers & Start Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
