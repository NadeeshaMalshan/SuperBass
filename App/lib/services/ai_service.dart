import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class AiService {
  static final AiService _instance = AiService._internal();
  factory AiService() => _instance;
  AiService._internal();

  /// Send message to the LangGraph Agent Backend on port 8001, with intelligent fallback
  Future<Map<String, dynamic>> sendMessage({
    required String message,
    required String email,
    String userType = 'Resident',
    String? conversationId,
    Map<String, dynamic>? metadata,
  }) async {
    final String convId = conversationId ?? 'conv_${DateTime.now().millisecondsSinceEpoch}';

    // 1. Try real Agent Backend
    try {
      final backendUrl = ApiConfig.agentBackendUrl;
      final uri = Uri.parse('$backendUrl/api/chat');
      final payload = {
        'message': message,
        'email': email,
        'user_type': userType,
        'conversation_id': convId,
        'metadata': metadata ?? {},
      };

      final response = await http
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 3));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return data;
      }
    } catch (e) {
      debugPrint('[AiService] Agent backend unreachable or timed out: $e. Using local intelligence.');
    }

    // 2. Intelligent local response engine if agent-backend is offline
    await Future.delayed(const Duration(milliseconds: 650));
    final lower = message.toLowerCase().trim();

    String replyText = '';
    String responseType = 'text_message';
    Map<String, dynamic> cardData = {};

    if (lower.contains('plumber') || lower.contains('plumbing')) {
      replyText = 'I found trusted plumbers nearby who can help with leaks, pipe repairs, and installations. Would you like to view top-rated plumbing experts or book an emergency technician?';
      responseType = 'worker_recommendation';
      cardData = {'category': 'Plumber'};
    } else if (lower.contains('electrician') || lower.contains('wiring') || lower.contains('power')) {
      replyText = 'Need electrical repairs or wiring assistance? Here are certified electricians available in your area ready for fast dispatch.';
      responseType = 'worker_recommendation';
      cardData = {'category': 'Electrician'};
    } else if (lower.contains('ac') || lower.contains('air condition') || lower.contains('cooling')) {
      replyText = 'AC repair and servicing specialists are available nearby. They handle gas refills, general servicing, and compressor diagnostics.';
      responseType = 'worker_recommendation';
      cardData = {'category': 'AC repair'};
    } else if (lower.contains('clean') || lower.contains('housekeep')) {
      replyText = 'Verified home cleaning and sanitization professionals are ready to assist you. Choose deep cleaning or standard maintenance.';
      responseType = 'worker_recommendation';
      cardData = {'category': 'Cleaner'};
    } else if (lower.contains('post') || lower.contains('community')) {
      replyText = 'You can broadcast service needs to local neighborhood technicians! Tell me what service you need, your area, and preferred budget, and I will help you post it.';
      responseType = 'community_post_prompt';
    } else if (lower.contains('booking') || lower.contains('appointment') || lower.contains('schedule')) {
      replyText = 'You can check all your ongoing and past appointments under the "Bookings" tab. Need help rescheduling or tracking an active job?';
      responseType = 'bookings_overview';
    } else if (lower.contains('rate') || lower.contains('review')) {
      replyText = 'Feedback helps our community maintain quality! To rate a technician, go to your completed bookings and tap "Leave Review".';
      responseType = 'rate_workers_info';
    } else if (lower.contains('find') || lower.contains('craftsmen') || lower.contains('worker')) {
      replyText = 'SuperBass connects you with background-verified service professionals across Sri Lanka. Select an emergency category or search directly by town!';
      responseType = 'find_workers_overview';
    } else {
      replyText = 'I am your Workio AI Assistant. I can help find top-rated workers, check job status, draft community requests, or diagnose household repair needs. What can I help you with today?';
    }

    return {
      'conversation_id': convId,
      'response': {
        'response_type': responseType,
        'message': replyText,
        'card_data': cardData,
        'metadata': {
          'source': 'local_engine',
        },
      },
    };
  }
}
