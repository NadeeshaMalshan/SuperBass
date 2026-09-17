import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/booking_model.dart';
import '../models/community_post_model.dart';
import '../models/worker_model.dart';
import 'api_config.dart';
import 'auth_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  Map<String, String> get _headers {
    final token = AuthService().currentUser?.token;
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  /// 1. Fetch Workers from /api/workers
  Future<List<WorkerModel>> fetchWorkers({String? skill, String? location}) async {
    try {
      Uri uri;
      if ((skill != null && skill.isNotEmpty && skill != 'All Pros') ||
          (location != null && location.isNotEmpty)) {
        uri = Uri.parse('${ApiConfig.baseUrl}/api/workers/search').replace(
          queryParameters: {
            if (skill != null && skill.isNotEmpty && skill != 'All Pros') 'skill': skill,
            if (location != null && location.isNotEmpty) 'location': location,
          },
        );
      } else {
        uri = Uri.parse('${ApiConfig.baseUrl}/api/workers');
      }

      debugPrint('Fetching workers from: $uri');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final dynamic data = jsonDecode(response.body);
        if (data is List) {
          return data.map((json) => WorkerModel.fromJson(json as Map<String, dynamic>)).toList();
        }
      }
      debugPrint('Failed to load workers (${response.statusCode}): ${response.body}');
      return [];
    } catch (e) {
      debugPrint('Error fetching workers: $e');
      return [];
    }
  }

  /// 2. Fetch Community Posts from /api/community-posts
  Future<List<CommunityPostModel>> fetchCommunityPosts({String? category, String? search}) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts').replace(
        queryParameters: {
          if (category != null && category.isNotEmpty && category != 'All') 'category': category,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );

      debugPrint('Fetching community posts from: $uri');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final dynamic data = jsonDecode(response.body);
        final currentUserEmail = AuthService().currentUser?.email;
        if (data is List) {
          return data
              .map((json) => CommunityPostModel.fromJson(json as Map<String, dynamic>, currentUserEmail: currentUserEmail))
              .toList();
        }
      }
      debugPrint('Failed to load community posts (${response.statusCode}): ${response.body}');
      return [];
    } catch (e) {
      debugPrint('Error fetching community posts: $e');
      return [];
    }
  }

  /// 3. Fetch Bookings for resident from /api/bookings/resident?email=...
  Future<List<BookingModel>> fetchResidentBookings(String residentEmail) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/bookings/resident').replace(
        queryParameters: {'email': residentEmail},
      );

      debugPrint('Fetching bookings from: $uri');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final dynamic data = jsonDecode(response.body);
        if (data is List) {
          return data.map((json) => BookingModel.fromJson(json as Map<String, dynamic>)).toList();
        }
      }
      debugPrint('Failed to load bookings (${response.statusCode}): ${response.body}');
      return [];
    } catch (e) {
      debugPrint('Error fetching bookings: $e');
      return [];
    }
  }

  /// 4. Create a new Booking: POST /api/bookings
  Future<BookingModel?> createBooking({
    required int workerId,
    required String jobTitle,
    required String description,
    required String urgency,
    DateTime? scheduledDate,
    String? locationAddress,
    String? contactPhone,
    double? estimatedPrice,
    String pricingModel = 'Hourly',
  }) async {
    try {
      final residentEmail = AuthService().currentUser?.email ?? 'resident@superbass.lk';
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/bookings');

      final body = jsonEncode({
        'workerId': workerId,
        'residentEmail': residentEmail,
        'jobTitle': jobTitle,
        'description': description,
        'urgency': urgency,
        'scheduledDate': (scheduledDate ?? DateTime.now().add(const Duration(days: 1))).toIso8601String(),
        'locationAddress': locationAddress ?? 'Colombo',
        'contactPhone': contactPhone ?? '0771234567',
        'pricingModel': pricingModel,
        'estimatedPrice': estimatedPrice ?? 2500.0,
      });

      debugPrint('Creating booking: $body');
      final response = await http.post(uri, headers: _headers, body: body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return BookingModel.fromJson(data);
      }
      debugPrint('Failed to create booking (${response.statusCode}): ${response.body}');
      return null;
    } catch (e) {
      debugPrint('Error creating booking: $e');
      return null;
    }
  }

  /// 5. Fetch user conversations: GET /api/conversations?userEmail=...
  Future<List<Map<String, dynamic>>> fetchConversations(String userEmail) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/conversations').replace(
        queryParameters: {'userEmail': userEmail},
      );

      final response = await http.get(uri, headers: _headers);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final dynamic data = jsonDecode(response.body);
        if (data is List) {
          return List<Map<String, dynamic>>.from(data);
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching conversations: $e');
      return [];
    }
  }

  /// 6. Fetch messages for a conversation: GET /api/conversations/{id}/messages
  Future<List<Map<String, dynamic>>> fetchMessages(int conversationId, String userEmail) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/conversations/$conversationId/messages').replace(
        queryParameters: {'userEmail': userEmail},
      );

      final response = await http.get(uri, headers: _headers);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final dynamic data = jsonDecode(response.body);
        if (data is List) {
          return List<Map<String, dynamic>>.from(data);
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching messages: $e');
      return [];
    }
  }

  /// 7. Send a message to a conversation
  Future<Map<String, dynamic>?> sendMessage({
    required int conversationId,
    required String content,
    required String senderEmail,
    String senderRole = 'Resident',
  }) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/conversations/$conversationId/messages');
      final body = jsonEncode({
        'senderEmail': senderEmail,
        'senderRole': senderRole,
        'content': content,
      });

      final response = await http.post(uri, headers: _headers, body: body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        debugPrint('Failed to send message: ${response.statusCode} - ${response.body}');
        return null;
      }
    } catch (e) {
      debugPrint('Error sending message: $e');
      return null;
    }
  }
}

