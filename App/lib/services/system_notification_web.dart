// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'package:flutter/foundation.dart';

class PlatformSystemNotification {
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    try {
      if (html.Notification.supported) {
        if (html.Notification.permission == 'granted') {
          debugPrint('Web Notification permission already granted.');
        }
      }
    } catch (e) {
      debugPrint('Web notification init error: $e');
    }
  }

  static Future<bool> requestPermission() async {
    try {
      if (!html.Notification.supported) return false;
      final perm = await html.Notification.requestPermission();
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
      if (!html.Notification.supported) return;

      if (html.Notification.permission == 'granted') {
        html.Notification(
          title,
          body: body,
          icon: 'favicon.png',
        );
      } else if (html.Notification.permission != 'denied') {
        final perm = await html.Notification.requestPermission();
        if (perm == 'granted') {
          html.Notification(
            title,
            body: body,
            icon: 'favicon.png',
          );
        }
      }
    } catch (e) {
      debugPrint('Error showing web system notification: $e');
    }
  }
}
