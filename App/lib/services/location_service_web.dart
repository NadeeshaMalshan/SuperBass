import 'dart:async';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

class PlatformLocationService {
  static Future<Map<String, double>?> getCurrentCoordinates() async {
    try {
      final pos = await html.window.navigator.geolocation.getCurrentPosition();

      return {
        'lat': pos.coords!.latitude!.toDouble(),
        'lng': pos.coords!.longitude!.toDouble(),
      };
    } catch (_) {
      return null;
    }
  }
}
