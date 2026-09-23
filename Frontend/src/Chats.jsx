import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import './Chats.css';
import '@material/web/progress/circular-progress.js';
import '@material/web/progress/linear-progress.js';
import '@material/web/dialog/dialog.js';
import '@material/web/button/text-button.js';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/menu/menu.js';
import '@material/web/menu/menu-item.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import Loader from './components/Loader.jsx';
import UserMenu from './components/UserMenu.jsx';
import { BACKEND_URL } from './config.js';
import { chatSignalR } from './services/chatSignalR.js';

const API_BASE_URL = `${BACKEND_URL}/api/conversations`;

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
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const dialogRef = useRef(null);

  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: null
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setDialogConfig(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
    };

    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) {
      if (dialogConfig.isOpen) {
        dialog.show();
      } else {
        dialog.close();
      }
    }
  }, [dialogConfig.isOpen]);

  const showAlert = (title, message) => {
    setDialogConfig({ isOpen: true, title, message, type: 'alert', onConfirm: null });
  };

  const showConfirm = (title, message, onConfirm) => {
    setDialogConfig({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  // New UI states for Search and Menu
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchMessageKeyword, setSearchMessageKeyword] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSelectModeActive, setIsSelectModeActive] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);

  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  const [isTyping, setIsTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(true);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const selectedChatRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingDebounceRef = useRef(null);

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

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Connect to SignalR and attach live listeners
  useEffect(() => {
    if (!currentUserEmail) return;

    chatSignalR.connect(currentUserEmail);

    // Heartbeat to keep web client presence active in ChatHub / backend
    const sendHeartbeat = async () => {
      try {
        await axios.post(`${API_BASE_URL}/heartbeat`, { userEmail: currentUserEmail }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch (e) {}
    };
    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    // 1. Live Incoming Messages
    const unsubMsg = chatSignalR.on('ReceiveMessage', (msg) => {
      if (!msg) return;
      const convId = msg.conversationId || msg.ConversationId;
      const currentChat = selectedChatRef.current;

      // Update sidebar conversation item
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === convId);
        if (idx === -1) {
          fetchConversations();
          return prev;
        }
        const updated = [...prev];
        const isCurrentActive = currentChat && currentChat.id === convId;
        updated[idx] = {
          ...updated[idx],
          lastMessage: msg.content || (msg.messageType === 'Image' ? 'Shared an image' : 'New message'),
          lastMessageAt: msg.createdAt || new Date().toISOString(),
          unreadCount: isCurrentActive ? 0 : (updated[idx].unreadCount || 0) + (msg.senderEmail?.toLowerCase() !== currentUserEmail.toLowerCase() ? 1 : 0)
        };
        return updated;
      });

      // If message belongs to active chat, display immediately
      if (currentChat && currentChat.id === convId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;

          // Replace optimistic local message if exists
          const localIdx = prev.findIndex(m =>
            m.id?.toString().startsWith('local-') &&
            m.senderEmail?.toLowerCase() === msg.senderEmail?.toLowerCase() &&
            m.content === msg.content
          );
          if (localIdx !== -1) {
            const newArr = [...prev];
            newArr[localIdx] = msg;
            return newArr;
          }
          return [...prev, msg];
        });

        // If message is from other user and active chat is open, instantly mark as read
        if (msg.senderEmail?.toLowerCase() !== currentUserEmail.toLowerCase()) {
          chatSignalR.markMessagesAsRead(convId);
          axios.post(`${API_BASE_URL}/${convId}/read`, { readerEmail: currentUserEmail }, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }).catch(() => {});
        }
      }
    });

    // 2. Live Read Receipts (Double Blue Checks)
    const unsubRead = chatSignalR.on('MessagesRead', (data) => {
      const convId = data?.conversationId ?? data?.ConversationId;
      const currentChat = selectedChatRef.current;

      if (currentChat && currentChat.id === convId) {
        // Mark all outgoing messages as read instantly
        setMessages(prev => prev.map(m => {
          const isOutgoing = m.senderEmail?.toLowerCase() === currentUserEmail.toLowerCase();
          if (isOutgoing && !m.isRead) {
            return { ...m, isRead: true };
          }
          return m;
        }));
      }
    });

    // 3. Live Presence (Active Now)
    const unsubPresence = chatSignalR.on('UserPresenceChanged', (data) => {
      const userEmail = data?.userEmail ?? data?.UserEmail;
      const isOnline = data?.isOnline ?? data?.IsOnline ?? false;
      const lastSeen = data?.lastSeen ?? data?.LastSeen;

      if (!userEmail) return;

      // Update sidebar conversation online indicator
      setConversations(prev => prev.map(c => {
        const otherEmail = c.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase()
          ? c.residentEmail
          : c.workerEmail;
        if (otherEmail?.toLowerCase() === userEmail.toLowerCase()) {
          return { ...c, isOnline };
        }
        return c;
      }));

      // Update active chat header
      const currentChat = selectedChatRef.current;
      if (currentChat) {
        const currentTargetEmail = currentChat.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase()
          ? currentChat.residentEmail
          : currentChat.workerEmail;
        if (currentTargetEmail?.toLowerCase() === userEmail.toLowerCase()) {
          setIsOtherUserOnline(isOnline);
          if (!isOnline && lastSeen) {
            setOtherUserLastSeen(lastSeen);
          }
        }
      }
    });

    // 4. Live Typing Indicator
    const unsubTyping = chatSignalR.on('UserTyping', (data) => {
      const convId = data?.conversationId ?? data?.ConversationId;
      const userEmail = data?.userEmail ?? data?.UserEmail;
      const isUserTyping = data?.isTyping ?? data?.IsTyping ?? false;
      const currentChat = selectedChatRef.current;

      if (currentChat && currentChat.id === convId) {
        if (userEmail?.toLowerCase() !== currentUserEmail.toLowerCase()) {
          setIsTyping(isUserTyping);
          if (isUserTyping) {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
              setIsTyping(false);
            }, 3500);
          }
        }
      }
    });

    // 5. Reconnection handler
    const unsubReconnect = chatSignalR.on('Reconnected', () => {
      const currentChat = selectedChatRef.current;
      if (currentChat) {
        chatSignalR.joinConversation(currentChat.id);
        loadMessages(currentChat.id, false);
      }
    });

    return () => {
      clearInterval(heartbeatInterval);
      unsubMsg();
      unsubRead();
      unsubPresence();
      unsubTyping();
      unsubReconnect();
    };
  }, [currentUserEmail]);

  // Fetch all user conversations
  const fetchConversations = async () => {
    try {
      const res = await axios.get(API_BASE_URL, {
        params: { userEmail: currentUserEmail },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      console.warn('Error loading conversations:', err.message);
    } finally {
      setIsDataLoaded(true);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 8000);
    return () => clearInterval(interval);
  }, [currentUserEmail]);

  // Load messages for selected chat
  const loadMessages = async (conversationId, isInitialLoad = false) => {
    if (!conversationId) return;
    if (isInitialLoad) setIsMessagesLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/${conversationId}/messages`, {
        params: { userEmail: currentUserEmail, page: 1, pageSize: 60 },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && Array.isArray(res.data)) {
        setMessages(res.data);
      }

      // Mark conversation as read via SignalR and REST API
      chatSignalR.markMessagesAsRead(conversationId);
      try {
        await axios.post(`${API_BASE_URL}/${conversationId}/read`, { readerEmail: currentUserEmail }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch (e) {}
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      if (isInitialLoad) setIsMessagesLoading(false);
    }
  };

  // When selected chat changes: join SignalR room, mark read, check presence
  useEffect(() => {
    if (!selectedChat) return;

    chatSignalR.joinConversation(selectedChat.id);
    loadMessages(selectedChat.id, true);

    // Optimistically clear unread badge in sidebar
    setConversations(prev => prev.map(c => c.id === selectedChat.id ? { ...c, unreadCount: 0 } : c));

    // Check initial presence of the other user
    const targetEmail = selectedChat.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase()
      ? selectedChat.residentEmail
      : selectedChat.workerEmail;

    const checkPresence = async () => {
      if (!targetEmail) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/presence`, {
          params: { userEmail: targetEmail },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data) {
          setIsOtherUserOnline(res.data.isOnline ?? true);
          setOtherUserLastSeen(res.data.lastSeen);
        }
      } catch (e) {}
    };

    checkPresence();

    // Fallback sync every 10 seconds
    const fallbackInterval = setInterval(() => {
      loadMessages(selectedChat.id, false);
    }, 10000);

    return () => {
      clearInterval(fallbackInterval);
      chatSignalR.leaveConversation(selectedChat.id);
    };
  }, [selectedChat?.id]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (selectedChat) {
      chatSignalR.sendTyping(selectedChat.id, true);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = setTimeout(() => {
        chatSignalR.sendTyping(selectedChat.id, false);
      }, 2000);
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedChat(conv);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text && !previewImage) return;
    if (!selectedChat) return;

    setIsSending(true);
    setShowEmojiPicker(false);

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    chatSignalR.sendTyping(selectedChat.id, false);

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

  const handleDeleteSelectedMessages = () => {
    if (!selectedMessageIds.length) return;
    
    const selectedMsgs = messages.filter(m => selectedMessageIds.includes(m.id));
    const now = new Date();
    
    const invalidMsgs = selectedMsgs.filter(m => {
      const isOutgoing = m.senderEmail?.toLowerCase() === currentUserEmail.toLowerCase();
      if (!isOutgoing) return true; // Can't delete received messages
      
      const msgDate = new Date(m.createdAt);
      const diffHours = (now - msgDate) / (1000 * 60 * 60);
      return diffHours > 24; // Can't delete messages older than 24 hours
    });

    if (invalidMsgs.length > 0) {
      showAlert("Action Blocked", "You can only delete your own messages sent within the last 24 hours.");
      return;
    }

    showConfirm("Delete Messages", `Are you sure you want to permanently delete ${selectedMessageIds.length} message(s)?`, async () => {
      try {
        await axios.post(`${API_BASE_URL}/messages/delete?userEmail=${currentUserEmail}`, selectedMessageIds, {
          headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
        });
        
        const remainingMsgs = messages.filter(m => !selectedMessageIds.includes(m.id));
        setMessages(remainingMsgs);
        setSelectedMessageIds([]);
        setIsSelectModeActive(false);

        // Update the sidebar preview
        setConversations(prev => prev.map(c => {
          if (selectedChat && c.id === selectedChat.id) {
            if (remainingMsgs.length > 0) {
              const newLastMsg = remainingMsgs[remainingMsgs.length - 1];
              let previewText = newLastMsg.content;
              if (!previewText && newLastMsg.attachmentUrl) {
                previewText = "Attachment";
              }
              return {
                ...c,
                lastMessage: previewText,
                lastMessageAt: newLastMsg.createdAt,
                lastSenderEmail: newLastMsg.senderEmail
              };
            } else {
              return {
                ...c,
                lastMessage: 'No messages yet',
                lastMessageAt: null
              };
            }
          }
          return c;
        }));
      } catch (err) {
        console.error('Error deleting messages:', err);
        showAlert("Error", err.response?.data?.message || 'Failed to delete messages.');
      }
    });
  };

  const handleDeleteChat = () => {
    if (!selectedChat) return;
    showConfirm("Delete Chat", "Are you sure you want to permanently delete this chat?", async () => {
      try {
        await axios.delete(`${API_BASE_URL}/${selectedChat.id}?userEmail=${currentUserEmail}`);
        setConversations(prev => prev.filter(c => c.id !== selectedChat.id));
        setSelectedChat(null);
        setIsMenuOpen(false);
      } catch (error) {
        console.error('Error deleting chat:', error);
        showAlert("Error", "Failed to delete chat.");
      }
    });
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
    <>
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
            <li className="chats-nav-link active">Messages</li>
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

          <div className="chats-search-wrapper" style={{ padding: '0 16px 12px 16px' }}>
            <md-outlined-text-field
              placeholder="Search conversations..."
              value={searchTerm}
              onInput={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', '--md-sys-color-primary': '#FDC101' }}
            >
              <i slot="leading-icon" className="fa-solid fa-magnifying-glass" style={{ color: '#64748b' }}></i>
            </md-outlined-text-field>
          </div>

          <div className="chats-conversations-list">
            {!isDataLoaded ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', color: '#64748b' }}>
                <Loader size={40} />
              </div>
            ) : filteredConversations.length === 0 ? (
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
              <md-list style={{ background: 'transparent' }}>
                {filteredConversations.map(conv => {
                  const isUserWorker = conv.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase();
                  const otherName = (isUserWorker ? conv.residentName : conv.workerName) || 'SuperBass Member';
                  
                  const getValidAvatar = (url) => {
                    if (!url || url === 'null' || url.trim() === '') return null;
                    if (url.startsWith('http')) return url;
                    return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
                  };
                  const otherAvatar = isUserWorker ? null : getValidAvatar(conv.workerProfileImage);
                  const isSelected = selectedChat?.id === conv.id;

                  return (
                    <md-list-item
                      type="button"
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      style={isSelected ? { '--md-list-item-container-color': '#fffbeb', borderLeft: '4px solid #FDC101' } : {}}
                    >
                      <div slot="start" style={{ position: 'relative' }}>
                        {otherAvatar ? (
                          <img src={otherAvatar} alt="avatar" className="chat-item-avatar" onError={(e) => e.target.style.display='none'} />
                        ) : (
                          <div className="chat-item-avatar">
                            {getInitial(otherName)}
                          </div>
                        )}
                        <div className={`chat-item-online ${conv.isOnline ? 'online' : 'offline'}`}></div>
                      </div>
                      
                      <div slot="headline" style={{ fontWeight: '600', color: '#0f172a' }}>
                        {otherName}
                      </div>
                      
                      <div slot="supporting-text" style={{ color: isSelected ? '#b45309' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                        {conv.lastMessage || 'No messages yet'}
                      </div>

                      <div slot="end" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {formatConversationTime(conv.lastMessageAt || conv.updatedAt)}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="chat-item-badge">{conv.unreadCount}</span>
                        )}
                      </div>
                    </md-list-item>
                  );
                })}
              </md-list>
            )}
          </div>
        </aside>

        {/* Right Active Chat Pane */}
        {selectedChat ? (
          <main className="chats-main-pane">
            {/* Header */}
            <div className="chats-main-header">
              <div className="chats-header-user-info">
                <div className="chats-header-avatar-wrapper">
                  {selectedChat.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase() ? (
                    <div className="chats-header-avatar">
                      {getInitial(selectedChat.residentName || 'Resident')}
                    </div>
                  ) : (() => {
                      const validHeaderAvatar = !selectedChat.workerProfileImage || selectedChat.workerProfileImage === 'null' || selectedChat.workerProfileImage.trim() === '' ? null 
                        : (selectedChat.workerProfileImage.startsWith('http') ? selectedChat.workerProfileImage : `${BACKEND_URL}${selectedChat.workerProfileImage.startsWith('/') ? '' : '/'}${selectedChat.workerProfileImage}`);
                      
                      return validHeaderAvatar ? (
                        <img src={validHeaderAvatar} alt="avatar" className="chats-header-avatar" onError={(e) => e.target.style.display='none'} />
                      ) : (
                        <div className="chats-header-avatar">
                          {getInitial(selectedChat.workerName || 'Worker')}
                        </div>
                      )
                  })()}
                  <span className={`chats-header-status-badge ${isOtherUserOnline ? 'online' : 'offline'}`}></span>
                </div>
                <div>
                  <h3 className="chats-header-name">
                    {selectedChat.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase()
                      ? (selectedChat.residentName || 'Resident Client')
                      : (selectedChat.workerName || 'SuperBass Worker')}
                  </h3>
                  <span className="chats-header-status">
                    {isTyping ? (
                      <span style={{ color: '#0284c7', fontWeight: 600 }}>✍️ typing...</span>
                    ) : isOtherUserOnline ? (
                      <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                        <i className="fa-solid fa-circle" style={{ fontSize: '0.45rem' }}></i> Active now
                      </span>
                    ) : otherUserLastSeen ? (
                      <span style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-regular fa-circle" style={{ fontSize: '0.45rem' }}></i> Last seen {formatConversationTime(otherUserLastSeen)}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', position: 'relative', alignItems: 'center' }}>
                {isSearchActive ? (
                  <div className="chats-search-header">
                    <input 
                      type="text" 
                      placeholder="Search in chat..." 
                      value={searchMessageKeyword}
                      onChange={(e) => setSearchMessageKeyword(e.target.value)}
                      autoFocus
                    />
                    <button type="button" onClick={() => { setIsSearchActive(false); setSearchMessageKeyword(''); }}>
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <>
                    {isSelectModeActive && selectedMessageIds.length > 0 && (
                      <md-icon-button
                        title="Delete Selected"
                        onClick={handleDeleteSelectedMessages}
                        style={{ '--md-sys-color-on-surface-variant': '#ef4444' }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </md-icon-button>
                    )}
                    <md-icon-button
                      title="Search Chat"
                      onClick={() => setIsSearchActive(true)}
                    >
                      <i className="fa-solid fa-search"></i>
                    </md-icon-button>
                    <md-icon-button
                      id="chat-menu-anchor"
                      title="Menu"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                      <i className="fa-solid fa-ellipsis-vertical"></i>
                    </md-icon-button>
                  </>
                )}

                <md-menu anchor="chat-menu-anchor" open={isMenuOpen} onClosed={() => setIsMenuOpen(false)} style={{ zIndex: 9999 }}>
                  <md-menu-item onClick={() => {
                      setIsMenuOpen(false);
                      const isUserWorker = selectedChat.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase();
                      if (!isUserWorker) {
                          navigate(`/worker-detail?id=${selectedChat.workerId}`);
                      }
                  }}>
                    <div slot="headline">View Info</div>
                    <i slot="end" className="fa-solid fa-circle-info" style={{ color: '#64748b' }}></i>
                  </md-menu-item>
                  <md-menu-item onClick={() => {
                      setIsMenuOpen(false);
                      setIsSelectModeActive(!isSelectModeActive);
                      setSelectedMessageIds([]);
                  }}>
                    <div slot="headline">{isSelectModeActive ? 'Cancel Selection' : 'Select Messages'}</div>
                    <i slot="end" className="fa-solid fa-check-square" style={{ color: '#64748b' }}></i>
                  </md-menu-item>
                  <md-menu-item onClick={() => { setIsMenuOpen(false); handleDeleteChat(); }}>
                    <div slot="headline" style={{ color: '#ef4444' }}>Delete Chat</div>
                    <i slot="end" className="fa-solid fa-trash" style={{ color: '#ef4444' }}></i>
                  </md-menu-item>
                </md-menu>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="chats-messages-stream" onClick={() => setShowEmojiPicker(false)}>
              {isMessagesLoading ? (
                <div className="chats-messages-loader-container">
                  <Loader size={50} />
                </div>
              ) : (
                <>
                  {messages.filter(msg => {
                    if (!isSearchActive || !searchMessageKeyword) return true;
                    return msg.content?.toLowerCase().includes(searchMessageKeyword.toLowerCase());
                  }).map((msg, idx, arr) => {
                    const isOutgoing = msg.senderEmail?.toLowerCase() === currentUserEmail.toLowerCase();
                    const otherPartyName = selectedChat.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase()
                      ? (selectedChat.residentName || 'Resident')
                      : (selectedChat.workerName || 'Worker');

                    const isSelected = selectedMessageIds.includes(msg.id);

                    let showDateDivider = false;
                    let dateDividerText = '';
                    
                    if (idx === 0) {
                      showDateDivider = true;
                    } else {
                      const prevMsg = arr[idx - 1];
                      const prevDate = new Date(prevMsg.createdAt).toDateString();
                      const currDate = new Date(msg.createdAt).toDateString();
                      if (prevDate !== currDate) {
                        showDateDivider = true;
                      }
                    }

                    if (showDateDivider) {
                      const msgDate = new Date(msg.createdAt);
                      const today = new Date();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);

                      if (msgDate.toDateString() === today.toDateString()) {
                        dateDividerText = 'Today';
                      } else if (msgDate.toDateString() === yesterday.toDateString()) {
                        dateDividerText = 'Yesterday';
                      } else {
                        dateDividerText = msgDate.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
                      }
                    }

                    return (
                      <React.Fragment key={msg.id || idx}>
                        {showDateDivider && (
                          <div className="chats-stream-date">{dateDividerText}</div>
                        )}
                        <div
                          className={`chats-bubble-row ${isOutgoing ? 'resident' : 'worker'}`}
                        onClick={() => {
                            if (isSelectModeActive && msg.id) {
                                setSelectedMessageIds(prev => 
                                    prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]
                                );
                            }
                        }}
                      >
                        {isSelectModeActive && (
                            <div className="chats-msg-checkbox">
                                <input type="checkbox" checked={isSelected} readOnly />
                            </div>
                        )}
                        {!isOutgoing && (
                          <div className="chats-msg-avatar">
                            {getInitial(otherPartyName)}
                          </div>
                        )}

                        <div className="chats-msg-wrapper">
                          <div className={`chats-bubble ${isOutgoing ? 'resident' : 'worker'}`}>
                            {msg.content && <div>{msg.content}</div>}
                            {msg.content && msg.content.includes('📋 Booking Requested #') && selectedChat.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase() && (
                              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                                <button onClick={() => window.location.href='/bookings'} style={{ backgroundColor: '#ffffff', color: '#000', padding: '6px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                  View in Bookings
                                </button>
                              </div>
                            )}
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
                            {isOutgoing && (
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
                    </React.Fragment>
                    );
                  })}

                  {isTyping && (
                    <div className="chats-bubble-row worker">
                      <div className="chats-msg-avatar">
                        {getInitial(selectedChat.workerEmail?.toLowerCase() === currentUserEmail.toLowerCase() ? (selectedChat.residentName || 'R') : (selectedChat.workerName || 'W'))}
                      </div>
                      <div className="chats-typing-bubble">
                        <span className="chats-typing-dot"></span>
                        <span className="chats-typing-dot"></span>
                        <span className="chats-typing-dot"></span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
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
              <div style={{ position: 'absolute', bottom: '80px', right: '20px', zIndex: 10 }}>
                <EmojiPicker onEmojiClick={(emojiData) => handleEmojiClick(emojiData.emoji)} />
              </div>
            )}

            {/* Bottom Input Area */}
            <div className="chats-input-bar-area" style={{ gap: '12px', padding: '12px 20px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <md-outlined-text-field
                  type="text"
                  placeholder="Text message"
                  value={inputText}
                  onInput={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  style={{ width: '100%', '--md-sys-color-primary': '#FDC101', '--md-outlined-text-field-container-shape': '24px' }}
                >
                  <md-icon-button slot="leading-icon" onClick={() => fileInputRef.current?.click()}>
                    <i className="fa-solid fa-circle-plus" style={{ color: '#64748b' }}></i>
                  </md-icon-button>
                  <md-icon-button slot="trailing-icon" onClick={() => setShowEmojiPicker(prev => !prev)}>
                    <i className="fa-regular fa-face-smile" style={{ color: '#64748b' }}></i>
                  </md-icon-button>
                </md-outlined-text-field>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleImageSelected}
                />
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

    {/* Material 3 Dialog Overlay via Portal */}
    {createPortal(
      <md-dialog ref={dialogRef} style={{ 
        '--md-dialog-container-color': '#ffffff',
        '--md-dialog-container-shape': '28px',
        position: 'fixed',
        inset: 0,
        margin: 'auto',
        zIndex: 9999,
        minWidth: '320px',
        maxWidth: '90vw'
      }}>
        <div slot="headline" style={{ color: '#000000', fontWeight: 'bold', padding: '24px 24px 16px 24px', fontSize: '1.25rem' }}>
          {dialogConfig.title}
        </div>
        <form slot="content" id="dialog-form" method="dialog" style={{ color: '#000000', padding: '0 24px 24px 24px', fontSize: '1rem', lineHeight: '1.5' }}>
          {dialogConfig.message}
        </form>
        <div slot="actions" style={{ padding: '0 24px 24px 24px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {dialogConfig.type === 'confirm' && (
            <md-text-button 
              onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
              style={{ '--md-sys-color-primary': '#475569', padding: '0 16px', minWidth: '80px' }}
            >
              Cancel
            </md-text-button>
          )}
          <md-filled-button
            onClick={() => {
              setDialogConfig(prev => ({ ...prev, isOpen: false }));
              if (dialogConfig.onConfirm) dialogConfig.onConfirm();
            }}
            style={{ '--md-sys-color-primary': '#eab308', '--md-sys-color-on-primary': '#000000', padding: '0 24px', minWidth: '100px' }}
          >
            {dialogConfig.type === 'confirm' ? 'Delete' : 'OK'}
          </md-filled-button>
        </div>
      </md-dialog>,
      document.body
    )}

    </>
  );
}
