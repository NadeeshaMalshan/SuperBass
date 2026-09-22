import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_notification_model.dart';
import '../models/booking_model.dart';
import 'api_service.dart';
import 'system_notification_service.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  static const String _prefsKey = 'superbass_app_notifications';

  final List<AppNotification> _notifications = [];
  final StreamController<AppNotification> _notificationStreamController =
      StreamController<AppNotification>.broadcast();

  final ValueNotifier<int> unreadCountNotifier = ValueNotifier<int>(0);

  Stream<AppNotification> get onNotificationReceived =>
      _notificationStreamController.stream;

  List<AppNotification> get notifications => List.unmodifiable(_notifications);

  Timer? _pollingTimer;
  String? _currentUserEmail;
  bool _isWorker = false;
  bool _initialized = false;

  // Track previous snapshots to detect new state changes
  final Map<int, String> _lastKnownBookingStatuses = {};
  final Map<int, String> _lastKnownMessageKeys = {};
  bool _initialBookingFetchDone = false;
  bool _initialChatFetchDone = false;

  /// Initialize service and restore persisted notifications
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    await _loadPersistedNotifications();
    await SystemNotificationService.initialize();
  }

  /// Start monitoring for notifications for the given user email
  void startListening(String userEmail, {bool isWorker = false}) {
    if (_currentUserEmail == userEmail && _pollingTimer != null) return;

    stopListening();
    _currentUserEmail = userEmail;
    _isWorker = isWorker;
    _initialBookingFetchDone = false;
    _initialChatFetchDone = false;
    _lastKnownBookingStatuses.clear();
    _lastKnownMessageKeys.clear();

    // Perform first fetch immediately
    _checkForUpdates();

    // Poll every 6 seconds while the app is active
    _pollingTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      _checkForUpdates();
    });
  }

  /// Stop monitoring
  void stopListening() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _currentUserEmail = null;
  }

  Future<void> _checkForUpdates() async {
    final email = _currentUserEmail;
    if (email == null || email.isEmpty) return;

    try {
      await Future.wait([
        _checkBookingUpdates(email),
        _checkChatUpdates(email),
      ]);
    } catch (e) {
      debugPrint('Error polling notifications: $e');
    }
  }

  /// 1. Check for booking status changes
  Future<void> _checkBookingUpdates(String email) async {
    try {
      final List<BookingModel> bookings;
      if (_isWorker) {
        bookings = await ApiService().fetchWorkerBookings(email);
      } else {
        bookings = await ApiService().fetchResidentBookings(email);
      }

      if (!_initialBookingFetchDone) {
        for (var b in bookings) {
          _lastKnownBookingStatuses[b.id] = b.status.toLowerCase();
        }
        _initialBookingFetchDone = true;
        return;
      }

      for (var b in bookings) {
        final currentStatus = b.status.toLowerCase();
        final prevStatus = _lastKnownBookingStatuses[b.id];

        if (prevStatus != null && prevStatus != currentStatus) {
          // Status has changed!
          _triggerBookingNotification(b, currentStatus);
        } else if (prevStatus == null && _isWorker && currentStatus == 'requested') {
          // New booking request arrived for worker
          _addAndBroadcastNotification(
            AppNotification(
              id: 'booking_new_${b.id}_${DateTime.now().millisecondsSinceEpoch}',
              title: 'New Booking Request! 📋',
              body: 'New request for "${b.jobTitle}" from ${b.residentName}.',
              type: NotificationType.bookingRequested,
              timestamp: DateTime.now(),
              referenceId: b.id,
              metadata: {'booking': b.toJson()},
            ),
          );
        }

        _lastKnownBookingStatuses[b.id] = currentStatus;
      }
    } catch (e) {
      debugPrint('Error checking booking updates: $e');
    }
  }

  void _triggerBookingNotification(BookingModel b, String newStatus) {
    String title;
    String body;
    NotificationType type;

    final workerName = b.workerName.isNotEmpty ? b.workerName : 'Worker';

    switch (newStatus) {
      case 'confirmed':
        title = 'Booking Confirmed! 🎉';
        body = '$workerName has accepted your booking for "${b.jobTitle}".';
        type = NotificationType.bookingApproved;
        break;
      case 'rejected':
        title = 'Booking Declined ❌';
        body = 'Your booking for "${b.jobTitle}" was declined: ${b.rejectionReason ?? "Worker unavailable"}.';
        type = NotificationType.bookingDeclined;
        break;
      case 'cancelled':
        title = 'Booking Cancelled ⚠️';
        body = 'The booking for "${b.jobTitle}" has been cancelled.';
        type = NotificationType.bookingCancelled;
        break;
      case 'in progress':
      case 'inprogress':
        title = 'Job In Progress 🚀';
        body = 'Work has started on "${b.jobTitle}".';
        type = NotificationType.bookingStarted;
        break;
      case 'completed':
        title = 'Job Completed! ✅';
        body = 'Your service for "${b.jobTitle}" has been completed.';
        type = NotificationType.bookingCompleted;
        break;
      default:
        title = 'Booking Update';
        body = 'Status for "${b.jobTitle}" is now $newStatus.';
        type = NotificationType.general;
    }

    _addAndBroadcastNotification(
      AppNotification(
        id: 'booking_${b.id}_${newStatus}_${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        body: body,
        type: type,
        timestamp: DateTime.now(),
        referenceId: b.id,
        metadata: {'booking': b.toJson()},
      ),
    );
  }

  /// 2. Check for new incoming chat messages
  Future<void> _checkChatUpdates(String email) async {
    try {
      final conversations = await ApiService().fetchConversations(email);

      if (!_initialChatFetchDone) {
        for (var c in conversations) {
          final int convId = c['id'] ?? c['conversationId'] ?? 0;
          final lastMsg = c['lastMessage'] ?? c['lastMessageContent'] ?? '';
          final lastAt = c['lastMessageAt']?.toString() ?? '';
          _lastKnownMessageKeys[convId] = '${lastMsg}_$lastAt';
        }
        _initialChatFetchDone = true;
        return;
      }

      for (var c in conversations) {
        final int convId = c['id'] ?? c['conversationId'] ?? 0;
        if (convId == 0) continue;

        final lastMsg = c['lastMessage'] ?? c['lastMessageContent']?.toString() ?? '';
        final lastSender = c['lastSenderEmail']?.toString() ?? '';
        final lastAt = c['lastMessageAt']?.toString() ?? '';
        final key = '${lastMsg}_$lastAt';

        final prevKey = _lastKnownMessageKeys[convId];

        if (prevKey != null && prevKey != key && lastMsg.isNotEmpty) {
          // If the message was sent by the other party (not current user)
          if (lastSender.toLowerCase() != email.toLowerCase()) {
            final otherName = c['workerName'] ??
                c['residentName'] ??
                c['otherPartyName'] ??
                'Support';
            final profileImage = c['workerProfileImage'] ?? c['residentProfileImage'];

            _addAndBroadcastNotification(
              AppNotification(
                id: 'chat_${convId}_${DateTime.now().millisecondsSinceEpoch}',
                title: 'New Message from $otherName 💬',
                body: lastMsg,
                type: NotificationType.chat,
                timestamp: DateTime.now(),
                referenceId: convId,
                metadata: {
                  'conversationId': convId,
                  'name': otherName,
                  'profileImage': profileImage,
                },
              ),
            );
          }
        }

        _lastKnownMessageKeys[convId] = key;
      }
    } catch (e) {
      debugPrint('Error checking chat updates: $e');
    }
  }

  /// Add notification to list, update count, persist, and broadcast to UI
  void _addAndBroadcastNotification(AppNotification notification) {
    _notifications.insert(0, notification);
    if (_notifications.length > 50) {
      _notifications.removeLast();
    }
    _updateUnreadCount();
    _savePersistedNotifications();
    _notificationStreamController.add(notification);

    // Trigger OS / Browser level system notification
    SystemNotificationService.show(
      id: notification.id.hashCode,
      title: notification.title,
      body: notification.body,
      payload: notification.referenceId?.toString(),
    );
  }

  /// Manually dispatch a notification (useful for local triggers)
  void dispatchNotification(AppNotification notification) {
    _addAndBroadcastNotification(notification);
  }

  /// Request system notification permission from OS or Browser
  Future<bool> requestSystemNotificationPermission() async {
    return await SystemNotificationService.requestPermission();
  }

  void markAsRead(String notificationId) {
    final index = _notifications.indexWhere((n) => n.id == notificationId);
    if (index != -1 && !_notifications[index].isRead) {
      _notifications[index].isRead = true;
      _updateUnreadCount();
      _savePersistedNotifications();
    }
  }

  void markAllAsRead() {
    for (var n in _notifications) {
      n.isRead = true;
    }
    _updateUnreadCount();
    _savePersistedNotifications();
  }

  void clearAll() {
    _notifications.clear();
    _updateUnreadCount();
    _savePersistedNotifications();
  }

  void _updateUnreadCount() {
    final count = _notifications.where((n) => !n.isRead).length;
    unreadCountNotifier.value = count;
  }

  Future<void> _loadPersistedNotifications() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final listJson = prefs.getStringList(_prefsKey);
      if (listJson != null) {
        _notifications.clear();
        for (var str in listJson) {
          try {
            _notifications.add(AppNotification.fromJson(str));
          } catch (_) {}
        }
        _updateUnreadCount();
      }
    } catch (e) {
      debugPrint('Error loading notifications: $e');
    }
  }

  Future<void> _savePersistedNotifications() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final listJson = _notifications.map((n) => n.toJson()).toList();
      await prefs.setStringList(_prefsKey, listJson);
    } catch (e) {
      debugPrint('Error saving notifications: $e');
    }
  }
}
