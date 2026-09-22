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

  // ==========================================
  // COMMUNITY POSTS API ENDPOINTS
  // ==========================================

  /// Fetch Service Categories from GET /api/community-posts/categories
  Future<List<ServiceCategoryModel>> fetchCommunityCategories() async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts/categories');
      final response = await http.get(uri, headers: _headers);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final dynamic data = jsonDecode(response.body);
        if (data is List) {
          return data.map((json) => ServiceCategoryModel.fromJson(json as Map<String, dynamic>)).toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching community categories: $e');
      return [];
    }
  }

  /// Fetch Community Posts from GET /api/community-posts?search=&category=&location=&sort=
  Future<List<CommunityPostModel>> fetchCommunityPosts({
    String? category,
    String? search,
    String? location,
    String? sort,
  }) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts').replace(
        queryParameters: {
          if (category != null && category.isNotEmpty && category.toLowerCase() != 'all') 'category': category,
          if (search != null && search.isNotEmpty) 'search': search,
          if (location != null && location.isNotEmpty && location.toLowerCase() != 'all') 'location': location,
          if (sort != null && sort.isNotEmpty) 'sort': sort,
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

  /// Fetch User's Own Community Posts from GET /api/community-posts/user/{email}
  Future<List<CommunityPostModel>> fetchUserCommunityPosts(String email) async {
    try {
      final encodedEmail = Uri.encodeComponent(email);
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts/user/$encodedEmail');
      debugPrint('Fetching user community posts from: $uri');
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
      return [];
    } catch (e) {
      debugPrint('Error fetching user community posts: $e');
      return [];
    }
  }

  /// Fetch single Post Details: GET /api/community-posts/{id}
  Future<CommunityPostModel?> fetchCommunityPostById(int id) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts/$id');
      final response = await http.get(uri, headers: _headers);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final currentUserEmail = AuthService().currentUser?.email;
        return CommunityPostModel.fromJson(data, currentUserEmail: currentUserEmail);
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching community post #$id: $e');
      return null;
    }
  }

  /// Create Post: POST /api/community-posts
  Future<CommunityPostModel?> createCommunityPost({
    required String title,
    required String content,
    String? serviceCategoryId,
    String? location,
    List<String>? images,
  }) async {
    try {
      final user = AuthService().currentUser;
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts');

      final body = jsonEncode({
        'title': title,
        'content': content,
        'serviceCategoryId': (serviceCategoryId != null && serviceCategoryId.isNotEmpty) ? serviceCategoryId : 'general',
        'location': (location != null && location.isNotEmpty) ? location : 'Colombo',
        'images': images ?? [],
        'userName': user?.name ?? 'Resident',
        'userAvatar': user?.picture ?? '',
        'userEmail': user?.email ?? 'demo_user_1',
        'userId': user?.email ?? 'demo_user_1',
      });

      debugPrint('Creating post: $body');
      final response = await http.post(uri, headers: _headers, body: body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return CommunityPostModel.fromJson(data, currentUserEmail: user?.email);
      }
      debugPrint('Failed to create post (${response.statusCode}): ${response.body}');
      return null;
    } catch (e) {
      debugPrint('Error creating community post: $e');
      return null;
    }
  }

  /// Update Post: PUT /api/community-posts/{id}
  Future<CommunityPostModel?> updateCommunityPost({
    required int id,
    required String title,
    required String content,
    String? serviceCategoryId,
    String? location,
    List<String>? images,
  }) async {
    try {
      final user = AuthService().currentUser;
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts/$id');

      final body = jsonEncode({
        'title': title,
        'content': content,
        'serviceCategoryId': (serviceCategoryId != null && serviceCategoryId.isNotEmpty) ? serviceCategoryId : 'general',
        'location': (location != null && location.isNotEmpty) ? location : 'Colombo',
        'images': images ?? [],
        'userName': user?.name ?? 'Resident',
        'userEmail': user?.email ?? 'demo_user_1',
        'userId': user?.email ?? 'demo_user_1',
      });

      debugPrint('Updating post #$id: $body');
      final response = await http.put(uri, headers: _headers, body: body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return CommunityPostModel.fromJson(data, currentUserEmail: user?.email);
      }
      debugPrint('Failed to update post (${response.statusCode}): ${response.body}');
      return null;
    } catch (e) {
      debugPrint('Error updating community post: $e');
      return null;
    }
  }

  /// Delete Post: DELETE /api/community-posts/{id}
  Future<bool> deleteCommunityPost(int id, {String? requesterEmail, String? requesterName}) async {
    try {
      final user = AuthService().currentUser;
      final email = requesterEmail ?? user?.email ?? 'demo_user_1';
      final name = requesterName ?? user?.name ?? 'Resident';

      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts/$id').replace(
        queryParameters: {
          'requesterEmail': email,
          'requesterName': name,
        },
      );

      debugPrint('Deleting post #$id: $uri');
      final response = await http.delete(uri, headers: _headers);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return true;
      }
      debugPrint('Failed to delete post (${response.statusCode}): ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error deleting community post: $e');
      return false;
    }
  }

  /// Fetch Post Comments: GET /api/community-posts/{id}/comments
  Future<List<CommunityCommentModel>> fetchPostComments(int postId) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts/$postId/comments');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final dynamic data = jsonDecode(response.body);
        if (data is List) {
          return data.map((json) => CommunityCommentModel.fromJson(json as Map<String, dynamic>)).toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching comments for post #$postId: $e');
      return [];
    }
  }

  /// Add Comment to Post: POST /api/community-posts/{id}/comments
  Future<CommunityCommentModel?> addPostComment({
    required int postId,
    required String content,
  }) async {
    try {
      final user = AuthService().currentUser;
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts/$postId/comments');

      final body = jsonEncode({
        'content': content,
        'userName': user?.name ?? 'Resident',
        'userAvatar': user?.picture ?? '',
      });

      debugPrint('Adding comment to post #$postId: $body');
      final response = await http.post(uri, headers: _headers, body: body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return CommunityCommentModel.fromJson(data);
      }
      debugPrint('Failed to add comment (${response.statusCode}): ${response.body}');
      return null;
    } catch (e) {
      debugPrint('Error adding comment: $e');
      return null;
    }
  }

  /// Toggle Like on Post: POST /api/community-posts/{id}/like
  Future<Map<String, dynamic>?> togglePostLike(int postId) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts/$postId/like');
      final response = await http.post(uri, headers: _headers);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      debugPrint('Failed to toggle like (${response.statusCode}): ${response.body}');
      return null;
    } catch (e) {
      debugPrint('Error toggling post like: $e');
      return null;
    }
  }

  /// Report Post: POST /api/community-posts/{id}/report
  Future<bool> reportCommunityPost({
    required int postId,
    required String reason,
  }) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/community-posts/$postId/report');
      final body = jsonEncode({'reason': reason});

      final response = await http.post(uri, headers: _headers, body: body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return true;
      }
      debugPrint('Failed to report post (${response.statusCode}): ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error reporting post: $e');
      return false;
    }
  }

  // ==========================================
  // BOOKINGS & CHAT API ENDPOINTS
  // ==========================================

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

  /// 3b. Fetch Bookings for worker from /api/bookings/worker?email=...
  Future<List<BookingModel>> fetchWorkerBookings(String workerEmail) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/bookings/worker').replace(
        queryParameters: {'email': workerEmail},
      );

      debugPrint('Fetching worker bookings from: $uri');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final dynamic data = jsonDecode(response.body);
        if (data is List) {
          return data.map((json) => BookingModel.fromJson(json as Map<String, dynamic>)).toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching worker bookings: $e');
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

  /// 4b. Cancel a booking: POST /api/bookings/{id}/cancel
  Future<bool> cancelBooking(int bookingId, {String reason = 'Cancelled by resident'}) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/bookings/$bookingId/cancel');
      final response = await http.post(
        uri,
        headers: _headers,
        body: jsonEncode({'reason': reason}),
      );
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return true;
      }
      debugPrint('Failed to cancel booking (${response.statusCode}): ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error cancelling booking: $e');
      return false;
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

  /// 5.5 Fetch conversation details: GET /api/conversations/{id}
  Future<Map<String, dynamic>?> fetchConversationDetails(int conversationId, String userEmail) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/conversations/$conversationId').replace(
        queryParameters: {'userEmail': userEmail},
      );
      final response = await http.get(uri, headers: _headers);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching conversation details: $e');
      return null;
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
