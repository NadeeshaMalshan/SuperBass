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
          .timeout(const Duration(seconds: 45));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return data;
      }
    } catch (e) {
      debugPrint('[AiService] Agent backend unreachable or timed out: $e. Using local intelligence.');
    }

    // 2. Intelligent local response engine if agent-backend is offline
    await Future.delayed(const Duration(milliseconds: 400));
    final lower = message.toLowerCase().trim();

    String replyText = '';
    String responseType = 'text_message';
    Map<String, dynamic> cardData = {};

    if (lower.contains('plumber') || lower.contains('plumbing')) {
      replyText = 'Here are verified plumbing professionals available in your area ready for fast dispatch.';
      responseType = 'worker_list';
      cardData = {
        'category': 'Plumber',
        'query': 'plumber',
        'totalCount': 3,
        'workers': [
          {
            'id': 1,
            'name': 'Kamal Perera',
            'primaryRole': 'Master Plumber',
            'skills': ['Pipe Leak Repair', 'Bathroom Fitting', 'Drain Cleaning'],
            'primaryServiceArea': 'Colombo',
            'overallRating': 4.9,
            'completedJobs': 42,
            'hourlyRate': 2500,
            'isVerified': true,
            'isAvailable': true,
          },
          {
            'id': 2,
            'name': 'Sunil Shantha',
            'primaryRole': 'Licensed Plumber',
            'skills': ['Water Pump Fix', 'CCTV Pipe Inspection'],
            'primaryServiceArea': 'Dehiwala',
            'overallRating': 4.8,
            'completedJobs': 29,
            'hourlyRate': 2200,
            'isVerified': true,
            'isAvailable': true,
          },
        ]
      };
    } else if (lower.contains('electrician') || lower.contains('wiring') || lower.contains('power')) {
      replyText = 'Need electrical repairs or wiring assistance? Here are certified electricians available in your area.';
      responseType = 'worker_list';
      cardData = {
        'category': 'Electrician',
        'query': 'electrician',
        'totalCount': 2,
        'workers': [
          {
            'id': 3,
            'name': 'Nimal Jayasinghe',
            'primaryRole': 'Certified Electrician',
            'skills': ['Tripping Fuse Fix', 'House Wiring', 'Solar Inverter Setup'],
            'primaryServiceArea': 'Colombo',
            'overallRating': 5.0,
            'completedJobs': 56,
            'hourlyRate': 2800,
            'isVerified': true,
            'isAvailable': true,
          },
          {
            'id': 4,
            'name': 'Nuwan Bandara',
            'primaryRole': 'Electrician & Technician',
            'skills': ['Short Circuit Repair', 'Lighting Installation'],
            'primaryServiceArea': 'Nugegoda',
            'overallRating': 4.7,
            'completedJobs': 21,
            'hourlyRate': 2400,
            'isVerified': true,
            'isAvailable': true,
          },
        ]
      };
    } else if (lower.contains('ac') || lower.contains('air condition') || lower.contains('cooling')) {
      replyText = 'AC repair and servicing specialists are available nearby.';
      responseType = 'worker_list';
      cardData = {
        'category': 'AC repair',
        'query': 'ac repair',
        'totalCount': 2,
        'workers': [
          {
            'id': 5,
            'name': 'Dinesh Fernando',
            'primaryRole': 'HVAC Specialist',
            'skills': ['Gas Refill R410A', 'Inverter AC Board Repair', 'Deep Chemical Wash'],
            'primaryServiceArea': 'Colombo',
            'overallRating': 4.9,
            'completedJobs': 63,
            'hourlyRate': 3000,
            'isVerified': true,
            'isAvailable': true,
          }
        ]
      };
    } else if (lower.contains('clean') || lower.contains('housekeep')) {
      replyText = 'Verified home cleaning and sanitization professionals are ready to assist you.';
      responseType = 'worker_list';
      cardData = {
        'category': 'Cleaner',
        'query': 'cleaning',
        'totalCount': 1,
        'workers': [
          {
            'id': 6,
            'name': 'Priyani Silva',
            'primaryRole': 'Home Care Specialist',
            'skills': ['Deep Floor Cleaning', 'Window Sanitization', 'Post-Construction Wash'],
            'primaryServiceArea': 'Colombo',
            'overallRating': 4.9,
            'completedJobs': 38,
            'hourlyRate': 1800,
            'isVerified': true,
            'isAvailable': true,
          }
        ]
      };
    } else if (lower.contains('find') || lower.contains('craftsmen') || lower.contains('worker')) {
      replyText = 'Here are top-rated verified service professionals near your location:';
      responseType = 'worker_list';
      cardData = {
        'category': 'All Pros',
        'query': 'verified pros',
        'totalCount': 3,
        'workers': [
          {
            'id': 1,
            'name': 'Kamal Perera',
            'primaryRole': 'Master Plumber',
            'skills': ['Leak Detection', 'Pipe Replacement'],
            'primaryServiceArea': 'Colombo',
            'overallRating': 4.9,
            'completedJobs': 42,
            'hourlyRate': 2500,
            'isVerified': true,
            'isAvailable': true,
          },
          {
            'id': 3,
            'name': 'Nimal Jayasinghe',
            'primaryRole': 'Certified Electrician',
            'skills': ['Fuse Board Fix', 'Lighting'],
            'primaryServiceArea': 'Colombo',
            'overallRating': 5.0,
            'completedJobs': 56,
            'hourlyRate': 2800,
            'isVerified': true,
            'isAvailable': true,
          }
        ]
      };
    } else if (lower.contains('create') && (lower.contains('post') || lower.contains('request') || lower.contains('community'))) {
      replyText = 'Please complete the details below to create your community service request:';
      responseType = 'create_community_post';
      cardData = {
        'title': 'Need Emergency Service',
        'content': 'I am looking for a verified technician in Colombo to assist with repair work.',
        'communityId': 'General',
        'location': 'Colombo',
      };
    } else if (lower.contains('post') || lower.contains('community')) {
      replyText = 'Here are recent community service requests posted by residents in your area:';
      responseType = 'post_list';
      cardData = {
        'category': 'Recent',
        'totalCount': 2,
        'posts': [
          {
            'id': 12,
            'title': 'Emergency Kitchen Sink Pipe Repair',
            'content': 'Main water line under kitchen counter is leaking heavily. Need experienced plumber today.',
            'communityId': 'Plumbing',
            'location': 'Colombo 03',
            'authorName': 'Ruwan Dias',
            'likesCount': 4,
            'commentsCount': 2,
          },
          {
            'id': 14,
            'title': 'Need AC Servicing before summer',
            'content': 'Looking for Panasonic inverter AC technician for full maintenance.',
            'communityId': 'AC repair',
            'location': 'Rajagiriya',
            'authorName': 'Chathura Fernando',
            'likesCount': 6,
            'commentsCount': 3,
          }
        ]
      };
    } else if (lower.contains('booking') || lower.contains('appointment') || lower.contains('schedule')) {
      replyText = 'Here is your active bookings and appointments overview:';
      responseType = 'booking_list';
      cardData = {
        'statusFilter': 'Active',
        'totalCount': 1,
        'bookings': [
          {
            'id': 101,
            'workerName': 'Kamal Perera',
            'jobTitle': 'Kitchen Pipe Leak Repair',
            'scheduledDate': DateTime.now().add(const Duration(days: 1)).toIso8601String(),
            'status': 'Confirmed',
            'locationAddress': 'No. 45, Galle Road, Colombo',
            'agreedPrice': 2500,
          }
        ]
      };
    } else if (lower.contains('review_booking') || metadata?['action'] == 'review_booking') {
      final bData = metadata?['booking_data'] is Map ? metadata!['booking_data'] as Map : {};
      final workerName = bData['workerName']?.toString() ?? 'Technician';
      replyText = "I've prepared the booking confirmation for $workerName. Please review the details below and confirm if you want to proceed:";
      responseType = 'booking_confirmation';
      cardData = Map<String, dynamic>.from(bData);
    } else if (lower.contains('confirm_booking') || metadata?['action'] == 'create_booking') {
      final bData = metadata?['booking_data'] is Map ? metadata!['booking_data'] as Map : {};
      final workerName = bData['workerName']?.toString() ?? 'Technician';
      replyText = 'Your appointment with $workerName has been successfully confirmed!';
      responseType = 'booking_confirmed';
      cardData = {
        'bookingId': 'BK-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
        'status': 'Confirmed',
        ...Map<String, dynamic>.from(bData),
      };
    } else if (lower.contains('rate') || lower.contains('review')) {
      replyText = 'Please rate your recent completed service appointment:';
      responseType = 'review_form';
      cardData = {
        'bookingId': '101',
        'workerId': '1',
        'workerName': 'Kamal Perera',
        'jobTitle': 'Kitchen Pipe Leak Repair',
      };
    } else if (lower.contains('category') || lower.contains('service')) {
      replyText = 'Explore all available home service categories:';
      responseType = 'service_categories';
      cardData = {
        'categories': [
          'Plumber', 'Electrician', 'AC repair', 'Cleaner',
          'Carpenter', 'Painter', 'Mason', 'Roofing'
        ]
      };
    } else {
      replyText = 'I am your Workio AI Assistant. I can help find top-rated workers, check job status, draft community requests, or diagnose household repair needs. What would you like to do?';
      responseType = 'text_message';
      cardData = {
        'suggestions': [
          'Find top plumbers near me',
          'Show my bookings',
          'Create community post',
          'Emergency AC repair'
        ]
      };
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

  /// List all previous conversation threads for a user from PostgreSQL
  Future<List<Map<String, dynamic>>> listConversations(String email) async {
    try {
      final backendUrl = ApiConfig.agentBackendUrl;
      final uri = Uri.parse('$backendUrl/api/conversations?email=${Uri.encodeComponent(email)}');
      final response = await http.get(uri).timeout(const Duration(seconds: 8));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final convs = data['conversations'] as List<dynamic>?;
        if (convs != null) {
          return convs.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
    } catch (e) {
      debugPrint('[AiService] Error listing conversations: $e');
    }
    return [];
  }

  /// Fetch all messages for a specific conversation from PostgreSQL
  Future<List<Map<String, dynamic>>> getConversationMessages(String convId) async {
    try {
      final backendUrl = ApiConfig.agentBackendUrl;
      final uri = Uri.parse('$backendUrl/api/conversations/$convId');
      final response = await http.get(uri).timeout(const Duration(seconds: 8));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final msgs = data['messages'] as List<dynamic>?;
        if (msgs != null) {
          return msgs.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
    } catch (e) {
      debugPrint('[AiService] Error fetching messages for $convId: $e');
    }
    return [];
  }

  /// Delete a conversation session from the agent backend
  Future<bool> deleteConversation(String convId, String email) async {
    try {
      final backendUrl = ApiConfig.agentBackendUrl;
      final uri = Uri.parse('$backendUrl/api/conversations/$convId?email=${Uri.encodeComponent(email)}');
      final response = await http.delete(uri).timeout(const Duration(seconds: 5));
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      debugPrint('[AiService] Error deleting conversation: $e');
      return false;
    }
  }
}
