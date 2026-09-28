/**
 * Workio Agent Backend API Service
 * Communicates with LangGraph Agent Backend on port 8001.
 */

import axios from 'axios';
import { AGENT_BACKEND_URL } from '../config.js';

const agentClient = axios.create({
  baseURL: AGENT_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 45000,
});

/**
 * Send a chat message to the Agentic Workflow
 * @param {Object} params
 * @param {string} params.message
 * @param {string} [params.email]
 * @param {string} [params.user_type]
 * @param {string} [params.conversation_id]
 * @param {Object} [params.metadata]
 * @returns {Promise<Object>} ChatResponse { conversation_id, response: { response_type, message, card_data, metadata } }
 */
export async function sendAgentMessage({ message, email, user_type = 'Resident', conversation_id, metadata }) {
  try {
    const payload = {
      message,
      email: email || localStorage.getItem('email') || '',
      user_type: user_type || localStorage.getItem('activeRole') || 'Resident',
      conversation_id: conversation_id || undefined,
      metadata: metadata || {},
    };

    console.groupCollapsed(
      `%c🤖 [AI Chat Request] %c"${message?.slice(0, 50)}${message?.length > 50 ? '...' : ''}"`,
      'color: #2563eb; font-weight: bold;',
      'color: #1e293b;'
    );
    console.log('Payload:', payload);
    console.groupEnd();

    const startTime = performance.now();
    const res = await agentClient.post('/api/chat', payload);
    const duration = Math.round(performance.now() - startTime);

    const meta = res.data?.response?.metadata || {};
    const tokens = meta.token_usage;
    const tokenStr = tokens ? ` | Tokens: ${tokens.total_tokens}` : '';
    const agentsStr = meta.agents && meta.agents.length > 0 ? ` | Agents: ${meta.agents.join(' ➔ ')}` : '';

    console.groupCollapsed(
      `%c✨ [AI Chat Response (${duration}ms)] %cType: ${res.data?.response?.response_type || 'unknown'}${agentsStr}${tokenStr}`,
      'color: #10b981; font-weight: bold;',
      'color: #0f172a;'
    );
    console.log('Thread ID:', res.data?.conversation_id);
    console.log('AI Message:', res.data?.response?.message);
    if (meta.agents) console.log('Agents Invoked:', meta.agents);
    if (meta.token_usage) console.log('Token Usage:', meta.token_usage);
    if (meta.steps) console.log('Execution Steps Breakdown:', meta.steps);
    console.log('Card Data:', res.data?.response?.card_data);
    console.log('Full Response Object:', res.data);
    console.groupEnd();

    return res.data;
  } catch (error) {
    console.group('%c❌ [AI Chat Error]', 'color: #ef4444; font-weight: bold;');
    console.error('Request failed:', error);
    if (error.response?.data) {
      console.log('Server Error Data:', error.response.data);
    }
    console.groupEnd();

    if (error.response?.data) {
      return error.response.data;
    }
    return {
      conversation_id: conversation_id || 'error-thread',
      response: {
        response_type: 'error',
        message: 'Could not connect to the Workio Agent server.',
        card_data: {
          errorCode: 'CONNECTION_ERROR',
          message: error.message || 'Network request failed',
          actionRequired: 'Ensure the agent-backend server is running at ' + AGENT_BACKEND_URL,
        },
        metadata: { error: true },
      },
    };
  }
}

/**
 * Retrieve recent backend logs from agent-backend
 * @param {number} [limit=100]
 * @returns {Promise<Object>}
 */
export async function getBackendLogs(limit = 100) {
  try {
    const res = await agentClient.get('/api/chat/logs', { params: { limit } });
    return res.data;
  } catch (e) {
    console.error('Failed to get backend logs:', e);
    return { logs: [], error: e.message };
  }
}

/**
 * Health check for Agent Backend
 */
export async function checkAgentHealth() {
  try {
    const res = await agentClient.get('/health', { timeout: 4000 });
    return res.data;
  } catch (e) {
    return { status: 'offline', error: e.message };
  }
}

/**
 * Health check for Workio MCP Server
 */
export async function checkMcpHealth() {
  try {
    const res = await agentClient.get('/api/mcp/health', { timeout: 4000 });
    return res.data;
  } catch (e) {
    return { status: 'offline', error: e.message };
  }
}

/**
 * Fetch all conversations for a user
 */
export async function listConversations(email) {
  try {
    const userEmail = email || localStorage.getItem('email') || '';
    if (!userEmail) return [];
    const res = await agentClient.get('/api/conversations', { params: { email: userEmail } });
    return res.data?.conversations || [];
  } catch (e) {
    console.error('Failed to list conversations:', e);
    return [];
  }
}

/**
 * Create a new conversation session
 */
export async function createConversation(email, title = 'New Conversation') {
  try {
    const userEmail = email || localStorage.getItem('email') || '';
    const res = await agentClient.post('/api/conversations', { email: userEmail, title });
    return res.data;
  } catch (e) {
    console.error('Failed to create conversation:', e);
    return null;
  }
}

/**
 * Fetch all messages for a specific conversation
 */
export async function getConversationMessages(convId) {
  try {
    const res = await agentClient.get(`/api/conversations/${convId}`);
    return res.data?.messages || [];
  } catch (e) {
    console.error(`Failed to load messages for ${convId}:`, e);
    return [];
  }
}

/**
 * Delete a conversation session
 */
export async function deleteConversation(convId, email) {
  try {
    const userEmail = email || localStorage.getItem('email') || '';
    const params = userEmail ? { email: userEmail } : {};
    const res = await agentClient.delete(`/api/conversations/${convId}`, { params });
    return res.data?.success || false;
  } catch (e) {
    console.error(`Failed to delete conversation ${convId}:`, e);
    return false;
  }
}

export default {
  sendAgentMessage,
  checkAgentHealth,
  checkMcpHealth,
  listConversations,
  createConversation,
  getConversationMessages,
  deleteConversation,
};
