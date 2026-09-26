import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatModal.css';
import { BACKEND_URL } from '../config.js';
import { chatSignalR } from '../services/chatSignalR.js';

const API_BASE_URL = `${BACKEND_URL}/api/conversations`;

const EMOJI_CATEGORIES = {
  smileys: [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜',
    '🤪', '🤗', '🤔', '🤐', '🤨', '😐', '😏', '😒', '🙄', '😬',
    '😴', '😷', '🤒', '🥳', '😎', '🤓', '🥺', '😭', '😤', '😡',
    '👍', '👎', '👌', '✌️', '🤞', '🤝', '🙏', '👏', '🙌', '💪'
  ],
  tools: [
    '🔧', '🔨', '🪛', '🪚', '🧰', '🔩', '⚙️', '🪜', '🚰', '🚿',
    '💡', '🔌', '🔋', '🚪', '🔑', '🧹', '🧺', '🧽', '🧯', '📦',
    '🏠', '🏡', '🏢', '🏗️', '🚗', '🚚', '🛵', '🕒', '📅', '💰',
    '👷', '👨‍🔧', '👩‍🔧', '🛠️', '🪣', '🪟', '🧱', '🪵', '🪢', '🪡'
  ],
  hearts: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖',
    '✨', '⭐', '🌟', '💥', '💯', '🔥', '🎉', '🎊', '🏆', '🎯',
    '☀️', '🌧️', '⚡', '🌈', '☕', '🥤', '🍕', '🍔', '✅', '❌'
  ]
};

export default function ChatModal({
  isOpen,
  onClose,
  recipient = {
    name: 'Jayashan Manodya',
    email: 'jayashan@superbass.lk',
    avatar: null,
    workerId: null,
    userId: null
  },
  postContext = null
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('smileys');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingDebounceRef = useRef(null);

  const currentUserEmail = localStorage.getItem('email') || '';
  const currentUserName = localStorage.getItem('userName') || (currentUserEmail ? currentUserEmail.split('@')[0] : 'You');
  const token = localStorage.getItem('token');

  // Check recipient presence initially & via SignalR
  useEffect(() => {
    if (!isOpen) return;

    chatSignalR.connect(currentUserEmail);

    const targetEmail = recipient.email || `${recipient.name?.toLowerCase().replace(/\s+/g, '') || 'worker'}@superbass.lk`;

    const checkPresence = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/presence`, {
          params: { userEmail: targetEmail },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data) {
          setIsOtherUserOnline(res.data.isOnline ?? true);
        }
      } catch (e) {}
    };
    checkPresence();

    const unsubPresence = chatSignalR.on('UserPresenceChanged', (data) => {
      const email = data?.userEmail ?? data?.UserEmail;
      const isOnline = data?.isOnline ?? data?.IsOnline ?? false;
      if (email?.toLowerCase() === targetEmail.toLowerCase()) {
        setIsOtherUserOnline(isOnline);
      }
    });

    return () => {
      unsubPresence();
    };
  }, [isOpen, recipient.email, recipient.name]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, showEmojiPicker]);

  // Handle conversation room & SignalR live messaging
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    chatSignalR.joinConversation(conversationId);
    chatSignalR.markMessagesAsRead(conversationId);

    // Live Read Receipts
    const unsubRead = chatSignalR.on('MessagesRead', (data) => {
      const convId = data?.conversationId ?? data?.ConversationId;
      if (convId === conversationId) {
        setMessages(prev => prev.map(m => {
          const isOutgoing = m.senderEmail?.toLowerCase() === currentUserEmail.toLowerCase();
          if (isOutgoing && !m.isRead) {
            return { ...m, isRead: true };
          }
          return m;
        }));
      }
    });

    // Live Incoming Messages
    const unsubMsg = chatSignalR.on('ReceiveMessage', (msg) => {
      if (!msg) return;
      const convId = msg.conversationId || msg.ConversationId;
      if (convId === conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          const localIdx = prev.findIndex(m =>
            m.id?.toString().startsWith('temp-') &&
            m.senderEmail?.toLowerCase() === msg.senderEmail?.toLowerCase() &&
            m.content === msg.content
          );
          if (localIdx !== -1) {
            const arr = [...prev];
            arr[localIdx] = msg;
            return arr;
          }
          return [...prev, msg];
        });

        if (msg.senderEmail?.toLowerCase() !== currentUserEmail.toLowerCase()) {
          chatSignalR.markMessagesAsRead(conversationId);
          axios.post(`${API_BASE_URL}/${conversationId}/read`, { readerEmail: currentUserEmail }, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }).catch(() => {});
        }
      }
    });

    // Live Typing Indicator
    const unsubTyping = chatSignalR.on('UserTyping', (data) => {
      const convId = data?.conversationId ?? data?.ConversationId;
      const userEmail = data?.userEmail ?? data?.UserEmail;
      const isUserTyping = data?.isTyping ?? data?.IsTyping ?? false;

      if (convId === conversationId && userEmail?.toLowerCase() !== currentUserEmail.toLowerCase()) {
        setIsTyping(isUserTyping);
        if (isUserTyping) {
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 3500);
        }
      }
    });

    return () => {
      chatSignalR.leaveConversation(conversationId);
      unsubRead();
      unsubMsg();
      unsubTyping();
    };
  }, [isOpen, conversationId]);

  useEffect(() => {
    if (!isOpen) {
      setShowEmojiPicker(false);
      return;
    }

    let isMounted = true;

    const initConversation = async () => {
      try {
        const res = await axios.post(API_BASE_URL, {
          workerId: recipient.workerId || 0,
          workerEmail: recipient.email || `${recipient.name?.toLowerCase().replace(/\s+/g, '') || 'worker'}@superbass.lk`,
          workerName: recipient.name || 'Jayashan Manodya',
          workerAvatar: recipient.avatar || null,
          residentEmail: currentUserEmail,
          bookingId: postContext?.id || null
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.data && res.data.id && isMounted) {
          setConversationId(res.data.id);
          loadMessages(res.data.id);
        }
      } catch (err) {
        console.warn('Backend conversations init error:', err.message);
        if (isMounted) {
          setMessages([]);
        }
      }
    };

    initConversation();

    const pollInterval = setInterval(() => {
      if (conversationId) {
        loadMessages(conversationId, true);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isOpen, recipient.email, recipient.workerId, recipient.name]);

  const loadMessages = async (convId, isPolling = false) => {
    if (!convId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/${convId}/messages`, {
        params: { userEmail: currentUserEmail, page: 1, pageSize: 60 },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && Array.isArray(res.data)) {
        setMessages(res.data);
      }

      // Mark incoming messages as read via SignalR and REST API
      chatSignalR.markMessagesAsRead(convId);
      try {
        await axios.post(`${API_BASE_URL}/${convId}/read`, { readerEmail: currentUserEmail }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch (e) {}
    } catch (err) {
      if (!isPolling) {
        console.error('Error fetching messages from DB:', err);
      }
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (conversationId) {
      chatSignalR.sendTyping(conversationId, true);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = setTimeout(() => {
        chatSignalR.sendTyping(conversationId, false);
      }, 2000);
    }
  };

  const handleSendMessage = async (customContent = null) => {
    const textToSend = customContent || inputText.trim();
    if (!textToSend && !previewImage) return;

    setIsSending(true);
    setShowEmojiPicker(false);

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    if (conversationId) chatSignalR.sendTyping(conversationId, false);

    const imageToClear = previewImage;
    const msgType = imageToClear ? 'Image' : 'Text';
    const msgContent = textToSend || (imageToClear ? 'Shared an image' : '');

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId || 1,
      senderEmail: currentUserEmail,
      senderRole: 'Resident',
      messageType: msgType,
      content: msgContent,
      attachmentUrl: imageToClear,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    setPreviewImage(null);

    try {
      let currentConvId = conversationId;

      if (!currentConvId) {
        const createRes = await axios.post(
          API_BASE_URL,
          {
            workerId: recipient.workerId || 0,
            workerEmail: recipient.email || `${recipient.name?.toLowerCase().replace(/\s+/g, '') || 'worker'}@superbass.lk`,
            workerName: recipient.name || 'Jayashan Manodya',
            workerAvatar: recipient.avatar || null,
            residentEmail: currentUserEmail,
            bookingId: postContext?.id || null
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }
        );
        if (createRes.data && createRes.data.id) {
          currentConvId = createRes.data.id;
          setConversationId(currentConvId);
        }
      }

      if (currentConvId) {
        await axios.post(
          `${API_BASE_URL}/${currentConvId}/messages`,
          {
            senderEmail: currentUserEmail,
            senderRole: 'Resident',
            receiverEmail: recipient.email || `${recipient.name?.toLowerCase().replace(/\s+/g, '') || 'worker'}@superbass.lk`,
            receiverRole: 'Worker',
            messageType: msgType,
            content: msgContent,
            attachmentUrl: imageToClear
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }
        );
        // Refresh messages from DB
        await loadMessages(currentConvId);
      }
    } catch (err) {
      console.error('Error saving message to DB:', err);
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

  const formatDividerDate = (dateStr) => {
    if (!dateStr) return 'Today · 12:00';
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dayName}, ${day} ${month} · ${time}`;
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getInitial = (name) => {
    if (!name) return 'A';
    return name.trim().charAt(0).toUpperCase();
  };

  if (!isOpen) return null;

  const hasText = inputText.trim().length > 0 || previewImage !== null;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="gm-header">
          <div className="gm-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="gm-avatar-wrapper">
                {recipient.avatar ? (
                  <img src={recipient.avatar} alt="avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div className="gm-worker-avatar" style={{ width: '42px', height: '42px', fontSize: '1.05rem' }}>
                    {getInitial(recipient.name || 'User')}
                  </div>
                )}
                <span className={`gm-avatar-status-badge ${isOtherUserOnline ? 'online' : 'offline'}`}></span>
              </div>
              <div>
                <h2 className="gm-header-title" style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.2 }}>{recipient.name || 'Jayashan Manodya'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', marginTop: '2px' }}>
                  {isTyping ? (
                    <span style={{ color: '#0284c7', fontWeight: 600 }}>✍️ typing...</span>
                  ) : isOtherUserOnline ? (
                    <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                      <i className="fa-solid fa-circle" style={{ fontSize: '0.45rem' }}></i> Active now
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fa-regular fa-circle" style={{ fontSize: '0.45rem' }}></i> Offline
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="gm-header-actions">
            <button className="gm-icon-btn" title="Notifications">
              <i className="fa-regular fa-bell"></i>
            </button>
            <button className="gm-icon-btn" title="More options">
              <i className="fa-solid fa-ellipsis-vertical"></i>
            </button>
            <button className="gm-icon-btn" onClick={onClose} title="Close" style={{ marginLeft: '4px' }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="gm-chat-body" onClick={() => setShowEmojiPicker(false)}>
          <div className="gm-date-divider">
            {messages.length > 0 ? formatDividerDate(messages[0]?.createdAt) : 'Today · 12:46'}
          </div>

          {messages.map((msg, index) => {
            const isOutgoing = msg.senderEmail?.toLowerCase() === currentUserEmail.toLowerCase();

            return (
              <div
                key={msg.id || index}
                className={`gm-message-row ${isOutgoing ? 'resident' : 'worker'}`}
              >
                {!isOutgoing && (
                  <div className="gm-avatar-wrapper">
                    {recipient.avatar ? (
                      <img src={recipient.avatar} alt="avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="gm-worker-avatar">
                        {getInitial(recipient.name || 'User')}
                      </div>
                    )}
                    <span className={`gm-avatar-status-badge ${isOtherUserOnline ? 'online' : 'offline'}`}></span>
                  </div>
                )}

                <div className="gm-bubble-wrapper">
                  <div className={`gm-bubble ${isOutgoing ? 'resident' : 'worker'}`}>
                    {msg.content && <div>{msg.content}</div>}
                    {msg.attachmentUrl && (
                      <img
                        src={msg.attachmentUrl}
                        alt="attachment"
                        className="gm-bubble-image"
                        onClick={() => window.open(msg.attachmentUrl, '_blank')}
                      />
                    )}
                  </div>
                  <div className="gm-time-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {isOutgoing && (
                      msg.id && msg.id.toString().startsWith('temp-') ? (
                        <i className="fa-solid fa-check" title="Sent" style={{ fontSize: '0.7rem', color: '#94a3b8' }}></i>
                      ) : msg.isRead ? (
                        <i className="fa-solid fa-check-double" title="Read" style={{ fontSize: '0.7rem', color: '#0284c7' }}></i>
                      ) : (
                        <i className="fa-solid fa-check-double" title="Delivered" style={{ fontSize: '0.7rem', color: '#94a3b8' }}></i>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="gm-message-row worker">
              <div className="gm-worker-avatar">
                {getInitial(recipient.name)}
              </div>
              <div className="gm-typing-bubble">
                <div className="gm-dot"></div>
                <div className="gm-dot"></div>
                <div className="gm-dot"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Image Attachment Preview if any */}
        {previewImage && (
          <div className="gm-attachment-preview">
            <img src={previewImage} alt="preview" className="gm-thumb" />
            <span style={{ fontSize: '0.85rem', color: '#5f6368', flex: 1 }}>Photo selected</span>
            <button className="gm-remove-thumb" onClick={() => setPreviewImage(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Google Messages Emoji Picker Panel */}
        {showEmojiPicker && (
          <div className="gm-emoji-panel">
            <div className="gm-emoji-tabs">
              <button
                className={`gm-emoji-tab-btn ${activeEmojiCategory === 'smileys' ? 'active' : ''}`}
                onClick={() => setActiveEmojiCategory('smileys')}
                title="Smileys & People"
              >
                😊
              </button>
              <button
                className={`gm-emoji-tab-btn ${activeEmojiCategory === 'tools' ? 'active' : ''}`}
                onClick={() => setActiveEmojiCategory('tools')}
                title="Home & Tools"
              >
                🔧
              </button>
              <button
                className={`gm-emoji-tab-btn ${activeEmojiCategory === 'hearts' ? 'active' : ''}`}
                onClick={() => setActiveEmojiCategory('hearts')}
                title="Symbols & Objects"
              >
                ✨
              </button>
            </div>

            <div className="gm-emoji-grid">
              {EMOJI_CATEGORIES[activeEmojiCategory].map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="gm-emoji-btn"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Input Bar */}
        <div className="gm-input-area">
          <div className="gm-pill-container">
            <input
              type="text"
              ref={textInputRef}
              className="gm-text-input"
              placeholder="Chat message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
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

            {/* Pill Action Icons */}
            <div className="gm-pill-actions">
              <button 
                type="button" 
                className={`gm-pill-icon ${showEmojiPicker ? 'active' : ''}`} 
                title="Choose emoji"
                onClick={() => setShowEmojiPicker(prev => !prev)}
              >
                <i className="fa-regular fa-face-smile"></i>
              </button>

              <button 
                type="button" 
                className="gm-pill-icon" 
                title="Attach photo"
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="fa-regular fa-image"></i>
              </button>
            </div>
          </div>

          {/* Circular Floating Send Button */}
          <button
            type="button"
            className={`gm-send-circle ${hasText ? 'active' : ''}`}
            onClick={() => handleSendMessage()}
            disabled={!hasText || isSending}
            title="Send Message"
          >
            <i className="fa-solid fa-paper-plane gm-send-icon"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
