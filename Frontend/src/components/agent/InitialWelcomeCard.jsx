import React from 'react';
import './AgentCards.css';

/**
 * InitialWelcomeCard - matches the modern welcome card with 4 action options:
 * 1. Find Workers (yellow search icon)
 * 2. Create Community Post (coral group icon)
 * 3. Chat with Workers (green chat bubble icon)
 * 4. Schedule Service (purple calendar icon)
 */
export default function InitialWelcomeCard({ data = {}, onAction }) {
  const title = data.title || 'Workio AI';
  const text =
    data.text ||
    'Hi! I can help you find workers, create a community post, or answer any questions about home services. What would you like to do today?';

  const defaultActions = [
    {
      id: 'find_workers',
      title: 'Find Workers',
      desc: 'Find trusted workers near you',
      icon: 'search',
      color: '#f59e0b',
      actionType: 'send_prompt',
      payload: 'I want to find a worker',
    },
    {
      id: 'create_post',
      title: 'Create Community Post',
      desc: 'Post your service needs to the community',
      icon: 'group',
      color: '#f43f5e',
      actionType: 'send_prompt',
      payload: 'I want to create a community post',
    },
    {
      id: 'chat_workers',
      title: 'Chat with Workers',
      desc: 'Discuss details and get quotes',
      icon: 'chat_bubble',
      color: '#10b981',
      actionType: 'navigate',
      payload: '/chats',
    },
    {
      id: 'schedule_service',
      title: 'Schedule Service',
      desc: 'Choose a time that works for you',
      icon: 'calendar_month',
      color: '#8b5cf6',
      actionType: 'send_prompt',
      payload: 'I want to schedule a service booking',
    },
  ];

  const actions = data.actions && data.actions.length > 0 ? data.actions : defaultActions;

  return (
    <div className="ai-welcome-card-root">
      {/* Top Header Row */}
      <div className="ai-welcome-card-header">
        <div className="ai-welcome-header-text">
          <h3 className="ai-welcome-title">{title}</h3>
          <p className="ai-welcome-subtitle">{text}</p>
        </div>
      </div>

      {/* 4 Interactive Option Cards */}
      <div className="ai-welcome-actions-list">
        {actions.map((act) => (
          <div
            key={act.id}
            className="ai-welcome-action-item"
            onClick={() => onAction && onAction(act.actionType, act.payload)}
            title={act.title}
          >
            <div className="ai-welcome-icon-box" style={{ backgroundColor: act.color }}>
              <md-icon style={{ fontSize: '19px', color: '#ffffff' }}>{act.icon}</md-icon>
            </div>
            <div className="ai-welcome-item-content">
              <div className="ai-welcome-item-title">{act.title}</div>
              <div className="ai-welcome-item-desc">{act.desc}</div>
            </div>
            <md-icon className="ai-welcome-chevron">chevron_right</md-icon>
          </div>
        ))}
      </div>
    </div>
  );
}
