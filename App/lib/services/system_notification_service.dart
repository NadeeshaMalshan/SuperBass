import 'system_notification_stub.dart'
    if (dart.library.html) 'system_notification_web.dart'
    if (dart.library.io) 'system_notification_io.dart';

class SystemNotificationService {
  static Future<void> initialize() async {
    await PlatformSystemNotification.initialize();
  }

  static Future<bool> requestPermission() async {
    return await PlatformSystemNotification.requestPermission();
  }

  static Future<void> show({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await PlatformSystemNotification.show(
      id: id,
      title: title,
      body: body,
      payload: payload,
    );
  }
}
