import 'dart:convert';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

enum NotificationType {
  chat,
  bookingApproved,
  bookingDeclined,
  bookingRequested,
  bookingCancelled,
  bookingStarted,
  bookingCompleted,
  general,
}

class AppNotification {
  final String id;
  final String title;
  final String body;
  final NotificationType type;
  final DateTime timestamp;
  bool isRead;
  final int? referenceId; // bookingId or conversationId
  final Map<String, dynamic>? metadata;

  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.timestamp,
    this.isRead = false,
    this.referenceId,
    this.metadata,
  });

  IconData get icon {
    switch (type) {
      case NotificationType.chat:
        return Icons.chat_bubble_rounded;
      case NotificationType.bookingApproved:
        return Icons.check_circle_rounded;
      case NotificationType.bookingDeclined:
        return Icons.cancel_rounded;
      case NotificationType.bookingRequested:
        return Icons.calendar_today_rounded;
      case NotificationType.bookingCancelled:
        return Icons.remove_circle_outline_rounded;
      case NotificationType.bookingStarted:
        return Icons.play_arrow_rounded;
      case NotificationType.bookingCompleted:
        return Icons.task_alt_rounded;
      case NotificationType.general:
        return Icons.notifications_rounded;
    }
  }

  Color get iconColor {
    switch (type) {
      case NotificationType.chat:
        return const Color(0xFF3B82F6);
      case NotificationType.bookingApproved:
        return const Color(0xFF10B981);
      case NotificationType.bookingDeclined:
      case NotificationType.bookingCancelled:
        return AppColors.error;
      case NotificationType.bookingRequested:
        return AppColors.brandYellow;
      case NotificationType.bookingStarted:
        return const Color(0xFF06B6D4);
      case NotificationType.bookingCompleted:
        return const Color(0xFF10B981);
      case NotificationType.general:
        return AppColors.onSurfaceVariant;
    }
  }

  Color get iconBgColor {
    return iconColor.withValues(alpha: 0.15);
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'body': body,
      'type': type.name,
      'timestamp': timestamp.toIso8601String(),
      'isRead': isRead,
      'referenceId': referenceId,
      'metadata': metadata,
    };
  }

  factory AppNotification.fromMap(Map<String, dynamic> map) {
    NotificationType type;
    try {
      type = NotificationType.values.byName(map['type'] ?? 'general');
    } catch (_) {
      type = NotificationType.general;
    }

    return AppNotification(
      id: map['id']?.toString() ?? UniqueKey().toString(),
      title: map['title'] ?? '',
      body: map['body'] ?? '',
      type: type,
      timestamp: map['timestamp'] != null
          ? DateTime.tryParse(map['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isRead: map['isRead'] == true,
      referenceId: map['referenceId'] != null ? int.tryParse(map['referenceId'].toString()) : null,
      metadata: map['metadata'] is Map<String, dynamic> ? Map<String, dynamic>.from(map['metadata']) : null,
    );
  }

  String toJson() => jsonEncode(toMap());
  factory AppNotification.fromJson(String source) => AppNotification.fromMap(jsonDecode(source));
}
