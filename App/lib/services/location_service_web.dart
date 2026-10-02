import 'dart:async';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

class PlatformLocationService {
  static Future<Map<String, double>?> getCurrentCoordinates() async {
    try {
      final completer = Completer<Map<String, double>?>();
      html.window.navigator.geolocation.getCurrentPosition(
        (html.Geoposition pos) {
          if (!completer.isCompleted) {
            completer.complete({
              'lat': pos.coords!.latitude!.toDouble(),
              'lng': pos.coords!.longitude!.toDouble(),
            });
          }
        },
        (html.PositionError _) {
          if (!completer.isCompleted) {
            completer.complete(null);
          }
        },
      );

      return await completer.future.timeout(
        const Duration(seconds: 8),
        onTimeout: () => null,
      );
    } catch (_) {
      return null;
    }
  }
}
