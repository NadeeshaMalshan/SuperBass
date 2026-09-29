import 'dart:js_interop';
import 'package:flutter/foundation.dart';
import 'package:web/web.dart' as web;

class PlatformSystemNotification {
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    try {
      if (web.Notification.permission == 'granted') {
        debugPrint('Web Notification permission already granted.');
      }
    } catch (e) {
      debugPrint('Web notification init error: $e');
    }
  }

  static Future<bool> requestPermission() async {
    try {
      final perm = (await web.Notification.requestPermission().toDart).toDart;
      return perm == 'granted';
    } catch (e) {
      debugPrint('Error requesting web notification permission: $e');
      return false;
    }
  }

  static Future<void> show({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    try {
      final permission = web.Notification.permission;
      if (permission == 'granted') {
        web.Notification(
          title,
          web.NotificationOptions(body: body, icon: 'favicon.png'),
        );
      } else if (permission != 'denied') {
        final perm = (await web.Notification.requestPermission().toDart).toDart;
        if (perm == 'granted') {
          web.Notification(
            title,
            web.NotificationOptions(body: body, icon: 'favicon.png'),
          );
        }
      }
    } catch (e) {
      debugPrint('Error showing web system notification: $e');
    }
  }
}
