import 'dart:async';
import 'dart:js_interop';
import 'package:web/web.dart' as web;

class PlatformLocationService {
  static Future<Map<String, double>?> getCurrentCoordinates() async {
    try {
      final completer = Completer<Map<String, double>?>();
      web.window.navigator.geolocation.getCurrentPosition(
        ((web.GeolocationPosition pos) {
          if (!completer.isCompleted) {
            completer.complete({
              'lat': pos.coords.latitude,
              'lng': pos.coords.longitude,
            });
          }
        }).toJS,
        ((web.GeolocationPositionError _) {
          if (!completer.isCompleted) {
            completer.complete(null);
          }
        }).toJS,
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
