/**
 * SuperBass Agent Backend API Service
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
      email: email || localStorage.getItem('email') || 'resident@superbass.lk',
      user_type: user_type || localStorage.getItem('activeRole') || 'Resident',
      conversation_id: conversation_id || undefined,
      metadata: metadata || {},
    };

    const res = await agentClient.post('/api/chat', payload);
    return res.data;
  } catch (error) {
    console.error('Agent chat request failed:', error);
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      conversation_id: conversation_id || 'error-thread',
      response: {
        response_type: 'error',
        message: 'Could not connect to the SuperBass Agent server.',
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
 * Health check for SuperBass MCP Server
 */
export async function checkMcpHealth() {
  try {
    const res = await agentClient.get('/api/mcp/health', { timeout: 4000 });
    return res.data;
  } catch (e) {
    return { status: 'offline', error: e.message };
  }
}

export default {
  sendAgentMessage,
  checkAgentHealth,
  checkMcpHealth,
};
