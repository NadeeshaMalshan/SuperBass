abstract class PlatformSystemNotification {
  static Future<void> initialize() async {}
  static Future<bool> requestPermission() async => false;
  static Future<void> show({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {}
}
